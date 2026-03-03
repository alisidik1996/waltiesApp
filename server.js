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
db.run("DROP TABLE IF EXISTS reservations");
db.run(`
CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama TEXT,
    no_hp TEXT,
    hari TEXT,
    tanggal TEXT,
    jam_mulai TEXT,
    jam_selesai TEXT,
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
        if (err) {
            console.error("Error fetching reservations:", err.message);
            return res.status(500).json({ error: true, message: "Could not fetch reservations." });
        }
        res.json(rows);
    });
});

/* ===============================
   ADD RESERVATION
=================================*/
app.post("/reservations", (req, res) => {
    const r = req.body;

    if (!Array.isArray(r.meja) || r.meja.length === 0) {
        return res.status(400).json({
            error: true,
            message: "Pilih minimal 1 meja"
        });
    }

    db.all(
        `SELECT * FROM reservations WHERE tanggal = ?`,
        [r.tanggal],
        (err, rows) => {
            if (err) {
                console.error("Error checking existing reservations:", err.message);
                return res.status(500).json({ error: true, message: "Could not check for existing reservations." });
            }

            for (let existing of rows) {
                // Check for time overlap
                const newStart = r.jam_mulai;
                const newEnd = r.jam_selesai;
                const existingStart = existing.jam_mulai;
                const existingEnd = existing.jam_selesai;

                const hasTimeOverlap = (newStart < existingEnd && newEnd > existingStart);

                if (hasTimeOverlap) {
                    let existingMeja;
                    try {
                        existingMeja = JSON.parse(existing.meja);
                    } catch {
                        existingMeja = [existing.meja];
                    }
    
                    for (let meja of r.meja) {
                        if (existingMeja.includes(meja)) {
                            return res.status(409).json({
                                error: true,
                                message: `Meja ${meja} sudah dibooking di tanggal dan rentang jam tersebut`
                            });
                        }
                    }
                }
            }

            const areaSet = [...new Set(r.meja.map(getAreaFromMeja))];
            const areaString = areaSet.join(", ");

            db.run(
                `INSERT INTO reservations 
                (nama,no_hp,hari,tanggal,jam_mulai,jam_selesai,pax,deposit,area,meja,acara,diterima_oleh,tanggal_diterima,keterangan)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                [
                    r.nama,
                    r.no_hp,
                    r.hari,
                    r.tanggal,
                    r.jam_mulai,
                    r.jam_selesai,
                    r.pax,
                    r.deposit,
                    areaString,
                    JSON.stringify(r.meja),
                    r.acara,
                    r.diterima_oleh,
                    r.tanggal_diterima,
                    r.keterangan
                ],
                function (err) {
                    if (err) {
                        console.error("Error inserting reservation:", err.message);
                        return res.status(500).json({ error: true, message: "Could not save reservation." });
                    }
                    res.status(201).json({ success: true, id: this.lastID });
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
            console.error("Error deleting reservation:", err.message);
            return res.status(500).json({ error: true, message: "Could not delete reservation." });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: true, message: "Reservation not found."});
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
            if (err) {
                console.error("Error searching reservations:", err.message);
                return res.status(500).json({ error: true, message: "Could not perform search."});
            }
            res.json(rows);
        }
    );
});

/* ===============================
   EXPORT EXCEL
=================================*/
app.get("/export", async (req, res) => {
    try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Reservasi");

        db.all("SELECT * FROM reservations ORDER BY id DESC", [], async (err, rows) => {
            if (err) {
                console.error("Error fetching reservations for export:", err.message);
                return res.status(500).send("Could not fetch data for export.");
            }

            worksheet.columns = [
                { header: "Nama", key: "nama", width: 20 },
                { header: "No HP", key: "no_hp", width: 15 },
                { header: "Hari", key: "hari", width: 10 },
                { header: "Tanggal", key: "tanggal", width: 12 },
                { header: "Jam Mulai", key: "jam_mulai", width: 10 },
                { header: "Jam Selesai", key: "jam_selesai", width: 10 },
                { header: "Pax", key: "pax", width: 8 },
                { header: "Deposit", key: "deposit", width: 12 },
                { header: "Area", key: "area", width: 15 },
                { header: "Meja", key: "meja", width: 30 },
                { header: "Acara", key: "acara", width: 20 },
                { header: "Diterima", key: "diterima_oleh", width: 15 },
                { header: "Tanggal Diterima", key: "tanggal_diterima", width: 18 },
                { header: "Keterangan", key: "keterangan", width: 30 }
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
                    meja: Array.isArray(mejaParsed) ? mejaParsed.join(", ") : mejaParsed
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
    } catch (error) {
        console.error("Failed to export Excel file:", error);
        res.status(500).send("An error occurred during the export process.");
    }
});


/* ===============================
   START SERVER
=================================*/
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
    console.log(`Server running on http://localhost:${PORT}`)
);
