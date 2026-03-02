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
    meja TEXT,
    acara TEXT,
    diterima_oleh TEXT,
    tanggal_diterima TEXT,
    keterangan TEXT
)
`);

/* ===============================
   HELPER: DETECT AREA FROM MEJA
=================================*/
const mejaList = {
  Indoor: [
    "(Indoor)Sofa Coklat: 5 Seats",
    "(Indoor)Sofa Abu: 7 Seats",
    "(Indoor)Table 1: 4 Seats",
    "(Indoor)Table 2: 4 Seats",
    "(Indoor)Table 3: 4 Seats",
    "(Indoor)Table 4: 2 Seats",
    "(Indoor)Table 5: 2 Seats"
  ],
  Outdoor: [
    "(Outdoor)Sofa Luar: 8 Seats",
    "(Outdoor)Table 20: 4 Seats",
    "(Outdoor)Table 21: 4 Seats",
    "(Outdoor)Table 22: 4 Seats",
    "(Outdoor)Table 23: 4 Seats",
    "(Outdoor)Table 24: 4 Seats",
    "(Outdoor)Table 25: 4 Seats"
  ],
  SW: [
    "(SW)Table 1: 2 Seats",
    "(SW)Table 2: 2 Seats",
    "(SW)Table 3: 4 Seats",
    "(SW)Table 4: 4 Seats",
    "(SW)Table 5: 4 Seats",
    "(SW)Table 6: 2 Seats",
    "(SW)Table 7: 2 Seats",
    "(SW)Table 8: 4 Seats",
    "(SW)Table 9: 2 Seats",
    "(SW)Table 10: 2 Seats"
  ]
};

function getAreaFromMeja(meja) {
  for (let area in mejaList) {
    if (mejaList[area].includes(meja)) {
      return area;
    }
  }
  return "-";
}

/* ===============================
   GET ALL RESERVATIONS
=================================*/
app.get("/reservations", (req, res) => {
    db.all("SELECT * FROM reservations ORDER BY id DESC", [], (err, rows) => {
        res.json(rows);
    });
});

/* ===============================
   ADD RESERVATION
=================================*/
app.post("/reservations", (req, res) => {
    const r = req.body;

    if (!Array.isArray(r.meja) || r.meja.length === 0) {
        return res.json({
            error: true,
            message: "Pilih minimal 1 meja"
        });
    }

    db.all(
        `SELECT * FROM reservations WHERE tanggal=?`,
        [r.tanggal],
        (err, rows) => {

            if (err) {
                return res.json({ error: true });
            }

            for (let existing of rows) {

                let existingMeja;
                try {
                    existingMeja = JSON.parse(existing.meja);
                } catch {
                    existingMeja = [existing.meja];
                }

                for (let meja of r.meja) {
                    if (existingMeja.includes(meja)) {
                        return res.json({
                            error: true,
                            message: `Meja ${meja} sudah dibooking di tanggal tersebut`
                        });
                    }
                }
            }

            // 🔥 AUTO DETECT AREA
            const areaSet = [...new Set(r.meja.map(getAreaFromMeja))];
            const areaString = areaSet.join(", ");

            db.run(
                `INSERT INTO reservations 
                (nama,no_hp,hari,tanggal,jam,pax,deposit,area,meja,acara,diterima_oleh,tanggal_diterima,keterangan)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                [
                    r.nama,
                    r.no_hp,
                    r.hari,
                    r.tanggal,
                    r.jam,
                    r.pax,
                    r.deposit,
                    areaString,
                    JSON.stringify(r.meja),
                    r.acara,
                    r.diterima_oleh,
                    r.tanggal_diterima,
                    r.keterangan
                ],
                function () {
                    res.json({ success: true });
                }
            );
        }
    );
});

/* ===============================
   DELETE
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
            { header: "Keterangan", key: "keterangan" }
        ];

        const formattedRows = rows.map(r => {
            let mejaParsed;
            try {
                mejaParsed = JSON.parse(r.meja);
            } catch {
                mejaParsed = [r.meja];
            }

            return {
                ...r,
                meja: mejaParsed.join(", ")
            };
        });

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