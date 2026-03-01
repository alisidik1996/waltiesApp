const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

const db = new sqlite3.Database("./database.db");

// Create table
db.run(`
CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama TEXT,
    no_hp TEXT,
    hari TEXT,
    tanggal TEXT,
    jam TEXT,
    pax INTEGER,
    deposit INTEGER,
    area TEXT,
    meja TEXT,
    acara TEXT,
    diterima_oleh TEXT,
    tanggal_diterima TEXT,
    paket TEXT
)
`);

// Get all reservations
app.get("/reservations", (req, res) => {
    db.all("SELECT * FROM reservations", [], (err, rows) => {
        res.json(rows);
    });
});

// Add reservation
app.post("/reservations", (req, res) => {
    const r = req.body;

    // Check duplicate meja + hari + jam
    db.get(
        `SELECT * FROM reservations WHERE meja=? AND hari=? AND jam=?`,
        [r.meja, r.hari, r.jam],
        (err, row) => {
            if (row) {
                return res.json({
                    error: true,
                    message: "Meja sudah dibooking!",
                    data: row
                });
            }

            db.run(
                `INSERT INTO reservations 
                (nama,no_hp,hari,tanggal,jam,pax,deposit,area,meja,acara,diterima_oleh,tanggal_diterima,paket)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                [
                    r.nama,
                    r.no_hp,
                    r.hari,
                    r.tanggal,
                    r.jam,
                    r.pax,
                    r.deposit,
                    r.area,
                    r.meja,
                    r.acara,
                    r.diterima_oleh,
                    r.tanggal_diterima,
                    r.paket
                ],
                function () {
                    res.json({ success: true });
                }
            );
        }
    );
});

app.delete("/reservations/:id", (req, res) => {
    const id = req.params.id;

    db.run("DELETE FROM reservations WHERE id = ?", [id], function(err) {
        if (err) {
            return res.json({ error: true });
        }

        res.json({ success: true });
    });
});

app.get("/reservations/search", (req, res) => {
    const keyword = req.query.q || "";

    db.all(
        `SELECT * FROM reservations 
         WHERE nama LIKE ? OR no_hp LIKE ?
         ORDER BY id DESC`,
        [`%${keyword}%`, `%${keyword}%`],
        (err, rows) => {
            if (err) return res.json([]);
            res.json(rows);
        }
    );
});

const ExcelJS = require("exceljs");

app.get("/export", async (req, res) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Reservasi");

    db.all("SELECT * FROM reservations", [], async (err, rows) => {

        worksheet.columns = [
            { header: "Nama", key: "nama" },
            { header: "No HP", key: "no_hp" },
            { header: "Hari", key: "hari" },
            { header: "Tanggal", key: "tanggal" },
            { header: "Jam", key: "jam" },
            { header: "Pax", key: "pax" },
            { header: "Deposit", key: "deposit" },
            { header: "Area", key: "area" },
            { header: "Meja", key: "meja" },
            { header: "Acara", key: "acara" },
            { header: "Diterima", key: "diterima_oleh" },
            { header: "Tgl Diterima	", key: "tanggal_diterima" },
            { header: "Paket", key: "paket" }

        ];

        worksheet.addRows(rows);

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
            "Content-Disposition",
            "attachment; filename=reservasi.xlsx"
        );

        await workbook.xlsx.write(res);
        res.end();
    });
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));