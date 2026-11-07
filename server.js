require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'development-secret-change-this',
  resave: false, saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: false, maxAge: 8 * 60 * 60 * 1000 }
}));
app.use(express.static(path.join(__dirname, 'public')));

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sireesha_pharmacy_db',
  waitForConnections: true, connectionLimit: 10, dateStrings: true
});
const asyncRoute = fn => (req,res,next) => Promise.resolve(fn(req,res,next)).catch(next);
const requireAuth = (req,res,next) => req.session.user ? next() : res.status(401).json({error:'Please sign in first.'});
const requireAdmin = (req,res,next) => req.session.user?.role === 'Admin' ? next() : res.status(403).json({error:'Administrator access required.'});
const validId = v => Number.isInteger(Number(v)) && Number(v) > 0;

app.get('/api/health', asyncRoute(async(req,res) => {
  await pool.query('SELECT 1'); res.json({ok:true, database:'connected'});
}));
app.get('/api/session', (req,res) => res.json({user:req.session.user || null}));
app.post('/api/register', asyncRoute(async(req,res) => {
  const {name,email,password,phone} = req.body;
  if (!name?.trim() || !email?.trim() || !password || password.length < 8)
    return res.status(400).json({error:'Name, email and a password of at least 8 characters are required.'});
  const hash = await bcrypt.hash(password, 10);
  try {
    const [r] = await pool.execute(
      'INSERT INTO users (name,email,password,phone,role) VALUES (?,?,?,?,?)',
      [name.trim(),email.trim().toLowerCase(),hash,phone || null,'Customer']);
    req.session.user = {user_id:r.insertId,name:name.trim(),email:email.trim().toLowerCase(),role:'Customer'};
    res.status(201).json({user:req.session.user});
  } catch(e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({error:'That email is already registered.'});
    throw e;
  }
}));
app.post('/api/login', asyncRoute(async(req,res) => {
  const {email,password} = req.body;
  const [rows] = await pool.execute('SELECT user_id,name,email,password,role FROM users WHERE email=?',[String(email||'').toLowerCase()]);
  if (!rows.length || !(await bcrypt.compare(password || '', rows[0].password)))
    return res.status(401).json({error:'Invalid email or password.'});
  const u=rows[0]; req.session.user={user_id:u.user_id,name:u.name,email:u.email,role:u.role};
  res.json({user:req.session.user});
}));
app.post('/api/logout',(req,res)=>req.session.destroy(()=>res.json({ok:true})));

app.get('/api/medicines', asyncRoute(async(req,res) => {
  const q = `%${String(req.query.q||'').trim()}%`;
  const [rows] = await pool.execute(
    `SELECT medicine_id,medicine_name,category,manufacture_price,stock,expiry_date
     FROM medicines WHERE medicine_name LIKE ? OR category LIKE ?
     ORDER BY medicine_name`,[q,q]);
  res.json(rows);
}));
app.get('/api/medicines/:id', asyncRoute(async(req,res) => {
  const [rows]=await pool.execute('SELECT * FROM medicines WHERE medicine_id=?',[req.params.id]);
  if(!rows.length) return res.status(404).json({error:'Medicine not found.'});
  res.json(rows[0]);
}));
app.post('/api/medicines',requireAuth,requireAdmin,asyncRoute(async(req,res) => {
  const {medicine_name,category,manufacture_price,stock,expiry_date}=req.body;
  if(!medicine_name?.trim() || !category?.trim() || Number(manufacture_price)<0 ||
     !Number.isFinite(Number(manufacture_price)) || !Number.isInteger(Number(stock)) ||
     Number(stock)<0 || !expiry_date) return res.status(400).json({error:'Enter valid medicine details.'});
  const [r]=await pool.execute(
    'INSERT INTO medicines (medicine_name,category,manufacture_price,stock,expiry_date) VALUES (?,?,?,?,?)',
    [medicine_name.trim(),category.trim(),manufacture_price,stock,expiry_date]);
  res.status(201).json({medicine_id:r.insertId,message:'Medicine added.'});
}));
app.put('/api/medicines/:id',requireAuth,requireAdmin,asyncRoute(async(req,res) => {
  const {medicine_name,category,manufacture_price,stock,expiry_date}=req.body;
  if(!validId(req.params.id) || !medicine_name?.trim() || !category?.trim() ||
     !Number.isFinite(Number(manufacture_price)) || Number(manufacture_price)<0 ||
     !Number.isInteger(Number(stock)) || Number(stock)<0 || !expiry_date)
    return res.status(400).json({error:'Enter valid medicine details.'});
  const [r]=await pool.execute(
    'UPDATE medicines SET medicine_name=?,category=?,manufacture_price=?,stock=?,expiry_date=? WHERE medicine_id=?',
    [medicine_name.trim(),category.trim(),manufacture_price,stock,expiry_date,req.params.id]);
  if(!r.affectedRows) return res.status(404).json({error:'Medicine not found.'});
  res.json({message:'Medicine updated.'});
}));
app.delete('/api/medicines/:id',requireAuth,requireAdmin,asyncRoute(async(req,res) => {
  try {
    const [r]=await pool.execute('DELETE FROM medicines WHERE medicine_id=?',[req.params.id]);
    if(!r.affectedRows) return res.status(404).json({error:'Medicine not found.'});
    res.json({message:'Medicine deleted.'});
  } catch(e) {
    if(e.code==='ER_ROW_IS_REFERENCED_2') return res.status(409).json({error:'This medicine appears in an order and cannot be deleted. Keep it for order history.'});
    throw e;
  }
}));

app.get('/api/users',requireAuth,requireAdmin,asyncRoute(async(req,res)=>{
  const [rows]=await pool.query('SELECT user_id,name,email,phone,role FROM users ORDER BY user_id DESC'); res.json(rows);
}));
app.get('/api/orders',requireAuth,asyncRoute(async(req,res)=>{
  const isAdmin=req.session.user.role==='Admin';
  const sql=`SELECT o.order_id,o.user_id,u.name AS customer_name,o.order_date,o.total_amount,o.status
             FROM orders o JOIN users u ON u.user_id=o.user_id
             ${isAdmin?'':'WHERE o.user_id=?'} ORDER BY o.order_id DESC`;
  const [rows]=await pool.execute(sql,isAdmin?[]:[req.session.user.user_id]); res.json(rows);
}));
app.get('/api/orders/:id/items',requireAuth,asyncRoute(async(req,res)=>{
  const [rows]=await pool.execute(
    `SELECT oi.item_id,oi.quantity,oi.price,m.medicine_name
     FROM order_items oi JOIN medicines m ON m.medicine_id=oi.medicine_id
     JOIN orders o ON o.order_id=oi.order_id
     WHERE oi.order_id=? ${req.session.user.role==='Admin'?'':'AND o.user_id=?'}`,
    req.session.user.role==='Admin'?[req.params.id]:[req.params.id,req.session.user.user_id]);
  res.json(rows);
}));
app.put('/api/orders/:id/status',requireAuth,requireAdmin,asyncRoute(async(req,res)=>{
  const allowed=['Placed','Processing','Shipped','Delivered','Cancelled'];
  if(!allowed.includes(req.body.status)) return res.status(400).json({error:'Invalid order status.'});
  const [r]=await pool.execute('UPDATE orders SET status=? WHERE order_id=?',[req.body.status,req.params.id]);
  if(!r.affectedRows) return res.status(404).json({error:'Order not found.'});
  res.json({message:'Order status updated.'});
}));
app.post('/api/orders',requireAuth,asyncRoute(async(req,res)=>{
  const items=req.body.items;
  if(!Array.isArray(items)||!items.length) return res.status(400).json({error:'Your cart is empty.'});
  const conn=await pool.getConnection();
  try {
    await conn.beginTransaction();
    let total=0, verified=[];
    for(const item of items){
      const qty=Number(item.quantity), id=Number(item.medicine_id);
      if(!validId(id)||!Number.isInteger(qty)||qty<1) throw new Error('Invalid cart item.');
      const [rows]=await conn.execute('SELECT medicine_id,medicine_name,manufacture_price,stock,expiry_date FROM medicines WHERE medicine_id=? FOR UPDATE',[id]);
      if(!rows.length) throw new Error('A medicine in your cart is no longer available.');
      const m=rows[0];
      if(new Date(m.expiry_date+'T00:00:00') < new Date(new Date().toDateString())) throw new Error(m.medicine_name+' has expired and cannot be ordered.');
      if(m.stock<qty) throw new Error('Insufficient stock for '+m.medicine_name+'. Available: '+m.stock);
      total += Number(m.manufacture_price)*qty;
      verified.push({id,qty,price:m.manufacture_price});
    }
    const [order]=await conn.execute(
      "INSERT INTO orders (user_id,order_date,total_amount,status) VALUES (?,CURDATE(),?,'Placed')",
      [req.session.user.user_id,total]);
    for(const item of verified){
      await conn.execute('INSERT INTO order_items (order_id,medicine_id,quantity,price) VALUES (?,?,?,?)',
        [order.insertId,item.id,item.qty,item.price]);
      await conn.execute('UPDATE medicines SET stock=stock-? WHERE medicine_id=?',[item.qty,item.id]);
    }
    await conn.commit(); res.status(201).json({order_id:order.insertId,total_amount:total,message:'Order placed successfully.'});
  } catch(e){await conn.rollback();res.status(400).json({error:e.message});}
  finally{conn.release();}
}));

app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
app.use((err,req,res,next)=>{console.error(err);res.status(500).json({error:'Server error. Check database configuration and server logs.'});});
const port=process.env.PORT||3000;
app.listen(port,()=>console.log(`Sireesha Pharmacy running at http://localhost:${port}`));
