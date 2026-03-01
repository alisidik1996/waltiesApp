/* ===============================
   GLOBAL STATE
=================================*/
let allData = [];
let displayedData = [];
let currentPage = 1;
const rowsPerPage = 20;

/* ===============================
   MEJA DATA
=================================*/
const mejaList = {
  Indoor: [
    "Sofa Coklat: 5 Seats",
    "Sofa Abu: 7 Seats",
    "Table 3: 4 Seats",
    "Table 2: 4 Seats",
    "Table 1: 4 Seats",
    "Table 4: 2 Seats",
    "Table 5: 2 Seats"
  ],
  Outdoor: [
    "Table 21: 4 Seats",
    "Table 22: 4 Seats",
    "Table 23: 4 Seats",
    "Table 24: 4 Seats",
    "Table 25: 4 Seats",
    "Table 20: 4 Seats",
    "Sofa Luar: 8 Seats"
  ],
  SW: [
    "SW Table 5: 4 Seats",
    "SW Table 8: 4 Seats",
    "SW Table 4: 4 Seats",
    "SW Table 3: 4 Seats",
    "SW Table 2: 2 Seats",
    "SW Table 1: 2 Seats",
    "SW Table 6: 2 Seats",
    "SW Table 9: 2 Seats",
    "SW Table 7: 2 Seats",
    "SW Table 10: 2 Seats"
  ]
};

/* ===============================
   DOM ELEMENTS
=================================*/
const mejaSelect = document.getElementById("mejaSelect");
const areaSelect = document.querySelector("select[name='area']");
const modal = document.getElementById("reservationModal");
const searchInput = document.getElementById("searchInput");
const totalSeatInfo = document.getElementById("totalSeatInfo");

/* ===============================
   HELPER: GET SEAT NUMBER
=================================*/
function getSeatCount(meja) {
  const match = meja.match(/(\d+)\s*Seats/i);
  return match ? parseInt(match[1]) : 0;
}

/* ===============================
   RENDER MEJA BERDASARKAN AREA
=================================*/
function renderMeja(area) {
  mejaSelect.innerHTML = "";

  if (!mejaList[area]) return;

  mejaList[area].forEach(meja => {
    const opt = document.createElement("option");
    opt.value = meja;
    opt.textContent = meja;
    mejaSelect.appendChild(opt);
  });

  updateTotalSeat();
}

/* ===============================
   HITUNG TOTAL SEAT
=================================*/
function updateTotalSeat() {
  const selected = Array.from(mejaSelect.selectedOptions).map(o => o.value);
  const total = selected.reduce((sum, meja) => sum + getSeatCount(meja), 0);

  totalSeatInfo.innerHTML =
    selected.length > 0
      ? `<strong>Total Seats:</strong> ${total}`
      : "";
}

mejaSelect.addEventListener("change", updateTotalSeat);

/* ===============================
   MODAL
=================================*/
function openModal() {
  modal.style.display = "block";
  renderMeja(areaSelect.value);
}

function closeModal() {
  modal.style.display = "none";
}

window.addEventListener("click", function (event) {
  if (event.target === modal) {
    closeModal();
  }
});

/* ===============================
   AREA CHANGE
=================================*/
areaSelect.addEventListener("change", function () {
  renderMeja(this.value);
});

/* ===============================
   CEK KETERSEDIAAN (MULTI MEJA)
=================================*/
async function checkAvailability() {
  const tanggal = document.getElementById("checkTanggal").value;
  const jam = document.getElementById("checkJam").value;

  if (!tanggal || !jam) {
    alert("Pilih tanggal dan jam dulu");
    return;
  }

  const res = await fetch("/reservations");
  const data = await res.json();

  const booked = data
    .filter(r => r.tanggal === tanggal)
    .map(r => JSON.parse(r.meja))
    .flat();

  let resultHTML = "";

  for (let area in mejaList) {
    const allMeja = mejaList[area];

    resultHTML += `
      <div class="area-card">
        <h4>${area}</h4>
        <div class="meja-grid">
          ${allMeja.map(m => {
            const isBooked = booked.includes(m);
            return `
              <div class="meja-item ${isBooked ? "meja-booked" : "meja-available"}">
                ${m}
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }

  document.getElementById("availabilityResult").innerHTML = resultHTML;
}

/* ===============================
   RENDER TABLE
=================================*/
function renderTable() {
  const tbody = document.getElementById("tableBody");
  tbody.innerHTML = "";

  const totalPages = Math.ceil(displayedData.length / rowsPerPage) || 1;
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * rowsPerPage;
  const paginated = displayedData.slice(start, start + rowsPerPage);

  paginated.forEach((r, i) => {
    const mejaDisplay =
      typeof r.meja === "string"
        ? JSON.parse(r.meja).join(", ")
        : r.meja.join(", ");

    tbody.innerHTML += `
      <tr>
        <td>${start + i + 1}</td>
        <td>${r.nama}</td>
        <td>${r.no_hp}</td>
        <td>${r.hari}</td>
        <td>${r.tanggal}</td>
        <td>${r.jam}</td>
        <td>${r.pax}</td>
        <td>${r.deposit}</td>
        <td>${r.area}</td>
        <td>${mejaDisplay}</td>
        <td>${r.acara}</td>
        <td>${r.diterima_oleh}</td>
        <td>${r.tanggal_diterima}</td>
        <td>${r.paket}</td>
        <td>
          <button class="btn-delete" onclick="deleteReservation(${r.id})">
            Hapus
          </button>
        </td>
      </tr>
    `;
  });

  document.getElementById("pageInfo").innerText =
    `Page ${currentPage} of ${totalPages}`;
}

/* ===============================
   LOAD DATA
=================================*/
async function loadData() {
  const res = await fetch("/reservations");
  allData = await res.json();
  displayedData = [...allData];
  currentPage = 1;
  renderTable();
}

/* ===============================
   PAGINATION
=================================*/
function nextPage() {
  const totalPages = Math.ceil(displayedData.length / rowsPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    renderTable();
  }
}

function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    renderTable();
  }
}

/* ===============================
   DELETE
=================================*/
async function deleteReservation(id) {
  if (!confirm("Yakin mau hapus reservasi ini?")) return;

  const res = await fetch(`/reservations/${id}`, {
    method: "DELETE"
  });

  const result = await res.json();

  if (result.success) {
    loadData();
  }
}

/* ===============================
   SEARCH
=================================*/
searchInput.addEventListener("input", function () {
  const keyword = this.value.trim().toLowerCase();

  if (keyword === "") {
    displayedData = [...allData];
  } else {
    displayedData = allData.filter(row =>
      row.nama.toLowerCase().includes(keyword) ||
      row.no_hp.toLowerCase().includes(keyword)
    );
  }

  currentPage = 1;
  renderTable();
});

/* ===============================
   SUBMIT FORM (MULTI MEJA + VALIDASI SEAT)
=================================*/
document
  .getElementById("reservationForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const formData = Object.fromEntries(new FormData(this));

    const selectedMeja = Array.from(mejaSelect.selectedOptions).map(o => o.value);

    if (selectedMeja.length === 0) {
      alert("Pilih minimal 1 meja");
      return;
    }

    const totalSeat = selectedMeja.reduce(
      (sum, meja) => sum + getSeatCount(meja),
      0
    );

    if (parseInt(formData.pax) > totalSeat) {
      alert(`Jumlah pax melebihi total seat (${totalSeat})`);
      return;
    }

    formData.meja = selectedMeja;

    const res = await fetch("/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData)
    });

    const result = await res.json();

    if (result.error) {
      alert(result.message);
    } else {
      alert("Reservasi berhasil disimpan!");
      closeModal();
      loadData();
      this.reset();
      totalSeatInfo.innerHTML = "";
    }
  });

/* ===============================
   INIT
=================================*/
loadData();