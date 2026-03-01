const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const cors = require("cors");
const ExcelJS = require("exceljs");

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

const db = new sqlite3.Database("./database.db");

/* ===============================
   CREATE TABLE
=================================*/
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
    meja TEXT, -- JSON STRING
    acara TEXT,
    diterima_oleh TEXT,
    tanggal_diterima TEXT,
    paket TEXT
)
`);

/* ===============================
   GET ALL RESERVATIONS
=================================*/
app.get("/reservations", (req, res) => {
    db.all("SELECT * FROM reservations ORDER BY id DESC", [], (err, rows) => {
        res.json(rows);
    });
});

/* ===============================
   ADD RESERVATION (MULTI MEJA)
=================================*/
app.post("/reservations", (req, res) => {
    const r = req.body;

    if (!Array.isArray(r.meja) || r.meja.length === 0) {
        return res.json({
            error: true,
            message: "Pilih minimal 1 meja"
        });
    }

    // Ambil semua reservasi di tanggal yang sama
    db.all(
        `SELECT * FROM reservations WHERE tanggal=?`,
        [r.tanggal],
        (err, rows) => {

            if (err) {
                return res.json({ error: true });
            }

            // Loop semua reservasi existing
            for (let existing of rows) {

                const existingMeja = JSON.parse(existing.meja);

                // Cek apakah ada meja yang bentrok
                for (let meja of r.meja) {
                    if (existingMeja.includes(meja)) {
                        return res.json({
                            error: true,
                            message: `Meja ${meja} sudah dibooking di tanggal tersebut`
                        });
                    }
                }
            }

            // Jika aman, insert
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
                    JSON.stringify(r.meja), // 🔥 simpan array jadi JSON
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

/* ===============================
   DELETE RESERVATION
=================================*/
app.delete("/reservations/:id", (req, res) => {
    const id = req.params.id;

    db.run("DELETE FROM reservations WHERE id = ?", [id], function(err) {
        if (err) {
            return res.json({ error: true });
        }
        res.json({ success: true });
    });
});

/* ===============================
   SEARCH
=================================*/
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

/* ===============================
   EXPORT EXCEL
=================================*/
app.get("/export", async (req, res) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Reservasi");

    db.all("SELECT * FROM reservations ORDER BY id DESC", [], async (err, rows) => {

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
            { header: "Tanggal Diterima", key: "tanggal_diterima" },
            { header: "Paket", key: "paket" }
        ];

        const formattedRows = rows.map(r => ({
            ...r,
            meja: JSON.parse(r.meja).join(", ")
        }));

        worksheet.addRows(formattedRows);

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

/* ===============================
   START SERVER
=================================*/
app.listen(3000, () => 
    console.log("Server running on http://localhost:3000")
);