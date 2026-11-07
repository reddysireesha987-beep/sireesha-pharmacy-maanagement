CREATE DATABASE IF NOT EXISTS sireesha_pharmacy_db;
USE sireesha_pharmacy_db;

CREATE TABLE IF NOT EXISTS users (
  user_id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(15),
  role VARCHAR(20) NOT NULL DEFAULT 'Customer',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_user_role CHECK (role IN ('Admin','Customer')),
  INDEX idx_users_role (role)
);

CREATE TABLE IF NOT EXISTS medicines (
  medicine_id INT PRIMARY KEY AUTO_INCREMENT,
  medicine_name VARCHAR(150) NOT NULL,
  category VARCHAR(100) NOT NULL,
  manufacture_price DECIMAL(10,2) NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  expiry_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_medicine_price CHECK (manufacture_price >= 0),
  CONSTRAINT chk_medicine_stock CHECK (stock >= 0),
  INDEX idx_medicine_name (medicine_name),
  INDEX idx_medicine_category (category),
  INDEX idx_medicine_expiry (expiry_date)
);

CREATE TABLE IF NOT EXISTS orders (
  order_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  order_date DATE NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'Placed',
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(user_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_order_total CHECK (total_amount >= 0),
  CONSTRAINT chk_order_status CHECK (status IN ('Placed','Processing','Shipped','Delivered','Cancelled')),
  INDEX idx_orders_user (user_id),
  INDEX idx_orders_date (order_date)
);

CREATE TABLE IF NOT EXISTS order_items (
  item_id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT NOT NULL,
  medicine_id INT NOT NULL,
  quantity INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  CONSTRAINT fk_items_order FOREIGN KEY (order_id) REFERENCES orders(order_id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_items_medicine FOREIGN KEY (medicine_id) REFERENCES medicines(medicine_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_item_quantity CHECK (quantity > 0),
  CONSTRAINT chk_item_price CHECK (price >= 0),
  INDEX idx_items_medicine (medicine_id)
);

INSERT IGNORE INTO medicines
(medicine_id,medicine_name,category,manufacture_price,stock,expiry_date) VALUES
(1,'Paracetamol 500mg','Pain Relief',25.00,120,'2027-12-31'),
(2,'Cetirizine 10mg','Allergy',18.50,80,'2027-08-30'),
(3,'Vitamin C 500mg','Vitamins',65.00,60,'2028-03-15'),
(4,'Antacid Tablets','Digestive Health',42.00,45,'2027-10-20'),
(5,'ORS Sachets','Hydration',20.00,100,'2028-01-10'),
(6,'Cough Syrup 100ml','Cold & Cough',95.00,35,'2027-06-30');


-- Additional everyday pharmacy-shop products (non-medicines).
-- Non-perishable items use 2099-12-31 because the existing schema requires an expiry_date.
INSERT IGNORE INTO medicines
(medicine_id,medicine_name,category,manufacture_price,stock,expiry_date) VALUES
(7,'Toothpaste 150g','Oral Care',95.00,40,'2099-12-31'),
(8,'Soft Toothbrush','Oral Care',35.00,55,'2099-12-31'),
(9,'Mouthwash 250ml','Oral Care',125.00,25,'2028-12-31'),
(10,'Bathing Soap','Personal Care',40.00,70,'2029-06-30'),
(11,'Shampoo 180ml','Personal Care',145.00,32,'2029-06-30'),
(12,'Hand Sanitizer 100ml','Personal Care',55.00,50,'2028-12-31'),
(13,'Moisturizing Lotion 200ml','Skin Care',180.00,24,'2029-06-30'),
(14,'Sunscreen SPF 50','Skin Care',299.00,18,'2028-12-31'),
(15,'Face Wash 100ml','Skin Care',135.00,30,'2029-06-30'),
(16,'Sanitary Pads (Pack)','Women Hygiene',85.00,60,'2029-12-31'),
(17,'Baby Diapers (Pack)','Baby Care',299.00,22,'2099-12-31'),
(18,'Baby Wipes (Pack)','Baby Care',99.00,35,'2029-12-31'),
(19,'Baby Powder 200g','Baby Care',110.00,20,'2029-06-30'),
(20,'Cotton Roll 50g','First Aid',45.00,45,'2099-12-31'),
(21,'Adhesive Bandages (Pack)','First Aid',30.00,80,'2099-12-31'),
(22,'Sterile Gauze Pads','First Aid',65.00,40,'2099-12-31'),
(23,'Crepe Bandage','First Aid',75.00,28,'2099-12-31'),
(24,'Digital Thermometer','Medical Devices',180.00,15,'2099-12-31'),
(25,'Digital BP Monitor','Medical Devices',1450.00,8,'2099-12-31'),
(26,'Glucometer','Medical Devices',850.00,10,'2099-12-31'),
(27,'Face Masks (Pack)','Personal Protection',50.00,100,'2099-12-31'),
(28,'Disposable Gloves (Pack)','Personal Protection',90.00,45,'2099-12-31'),
(29,'Hot Water Bag','Wellness Accessories',160.00,16,'2099-12-31'),
(30,'Pill Organizer Box','Wellness Accessories',75.00,25,'2099-12-31'),
(31,'ORS Ready-to-Drink','Hydration',35.00,30,'2027-12-31'),
(32,'Protein Nutrition Powder','Nutrition',650.00,12,'2028-12-31'),
(33,'Adult Toothbrush (Soft)','Oral Care',30.00,45,'2099-12-31'),
(34,'Nail Clipper','Personal Care',45.00,25,'2099-12-31'),
(35,'Petroleum Jelly 100g','Skin Care',75.00,30,'2029-06-30');
