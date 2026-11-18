# MT Running Club

เว็บค้นหาชื่อจาก Google Sheets เพื่อเลือกรายชื่อและดูสังกัด รองรับการเผยแพร่ผ่าน GitHub Pages

## ตั้งค่า Google Sheets
1. ใช้ Google Sheet ที่มีแท็บชื่อ `Employee` โดยคอลัมน์ A เป็นชื่อ-นามสกุล คอลัมน์ B เป็นสังกัด และแถวแรกเป็นหัวตาราง
2. ในชีตเลือก Extensions → Apps Script แล้วนำโค้ดทั้งหมดจาก `Code.gs` ไปวางและบันทึก
3. เลือก Deploy → New deployment → Web app ตั้งค่า Execute as เป็นตัวคุณ และ Who has access เป็น Anyone แล้ว Deploy และอนุญาตสิทธิ์ หากเคยติดตั้งแล้ว ให้สร้าง deployment เวอร์ชันใหม่เพื่อใช้โค้ดล่าสุด
4. คัดลอก Web app URL ลงใน `config.js` แล้วทดสอบค้นหาและเลือกรายชื่อจริง

ผู้ที่เข้าถึง Web app URL สามารถค้นหารายชื่อและสังกัดได้ จึงควรใช้การตั้งค่านี้เฉพาะเมื่ออนุญาตให้ข้อมูลดังกล่าวเปิดเผยได้ หากต้องการจำกัดผู้เข้าถึงต้องเพิ่มระบบยืนยันตัวตนก่อนใช้งาน

## เผยแพร่ผ่าน GitHub Pages
อัปโหลดไฟล์ไปยัง GitHub repository แล้วไปที่ Settings → Pages เลือก Deploy from a branch และเลือก branch กับโฟลเดอร์ root จากนั้นเปิด URL ที่ GitHub Pages แจ้งและทดสอบอีกครั้ง
