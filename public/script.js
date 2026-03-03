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

/* ===============================
   DOM ELEMENTS
=================================*/
const mejaContainer = document.getElementById("mejaContainer");
const modal = document.getElementById("reservationModal");
const searchInput = document.getElementById("searchInput");
const totalSeatInfo = document.getElementById("totalSeatInfo");

/* ===============================
   HELPER
=================================*/
function getSeatCount(meja) {
  const match = meja.match(/(\d+)\s*Seats/i);
  return match ? parseInt(match[1]) : 0;
}

function getAreaFromMeja(meja) {
  for (let area in mejaList) {
    if (mejaList[area].includes(meja)) {
      return area;
    }
  }
  return "-";
}

function formatTime(timeString) {
    if (!timeString) return '';
    const [hour, minute] = timeString.split(':');
    let h = parseInt(hour);
    const m = minute.padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12; // the hour '0' should be '12'
    return `${h}:${m} ${ampm}`;
}

/* ===============================
   RENDER SEMUA MEJA (GROUPED)
=================================*/
function renderMeja() {
  mejaContainer.innerHTML = "";

  for (let area in mejaList) {

    const title = document.createElement("div");
    title.className = "meja-area-title";
    title.textContent = area;
    mejaContainer.appendChild(title);

    mejaList[area].forEach(meja => {
      const wrapper = document.createElement("div");
      wrapper.className = "meja-item-wrapper";

      wrapper.innerHTML = `
        <input type="checkbox" value="${meja}">
        <label>${meja}</label>
      `;

      mejaContainer.appendChild(wrapper);
    });
  }

  updateTotalSeat();
}

mejaContainer.addEventListener("change", updateTotalSeat);

/* ===============================
   HITUNG TOTAL SEAT
=================================*/
function updateTotalSeat() {
  const selected = Array.from(
    mejaContainer.querySelectorAll("input[type='checkbox']:checked")
  ).map(cb => cb.value);

  const total = selected.reduce((sum, meja) => {
    return sum + getSeatCount(meja);
  }, 0);

  totalSeatInfo.innerHTML =
    selected.length > 0
      ? `<strong>Total Seats:</strong> ${total}`
      : "";
}

/* ===============================
   MODAL
=================================*/
function openModal() {
  modal.style.display = "block";
  renderMeja();
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
   CEK KETERSEDIAAN
=================================*/
async function checkAvailability() {
  const tanggal = document.getElementById("checkTanggal").value;
  const jamMulai = document.getElementById("checkJamMulai").value;
  const jamSelesai = document.getElementById("checkJamSelesai").value;

  if (!tanggal || !jamMulai || !jamSelesai) {
    alert("Pilih tanggal, jam mulai, dan jam selesai");
    return;
  }

  const res = await fetch("/reservations");
  const data = await res.json();

  const booked = data
    .filter(r => {
        return r.tanggal === tanggal &&
        ((jamMulai >= r.jam_mulai && jamMulai < r.jam_selesai) || 
         (jamSelesai > r.jam_mulai && jamSelesai <= r.jam_selesai) ||
         (jamMulai <= r.jam_mulai && jamSelesai >= r.jam_selesai))
    })
    .map(r => {
      try {
        return JSON.parse(r.meja);
      } catch {
        return [r.meja];
      }
    })
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

    let mejaParsed;
    try {
      mejaParsed = JSON.parse(r.meja);
    } catch {
      mejaParsed = [r.meja];
    }

    const mejaDisplay = mejaParsed.join(", ");

    const areaSet = [...new Set(mejaParsed.map(getAreaFromMeja))];
    const areaDisplay = areaSet.join(", ");

    tbody.innerHTML += `
      <tr>
        <td>${start + i + 1}</td>
        <td>${r.nama}</td>
        <td>${r.no_hp}</td>
        <td>${r.hari}</td>
        <td>${r.tanggal}</td>
        <td>${formatTime(r.jam_mulai)}</td>
        <td>${formatTime(r.jam_selesai)}</td>
        <td>${r.pax}</td>
        <td>${r.deposit}</td>
        <td>${areaDisplay}</td>
        <td>${mejaDisplay}</td>
        <td>${r.acara}</td>
        <td>${r.diterima_oleh}</td>
        <td>${r.tanggal_diterima}</td>
        <td>${r.keterangan}</td>
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
   SUBMIT FORM
=================================*/
document
  .getElementById("reservationForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const formData = Object.fromEntries(new FormData(this));

    const selectedMeja = Array.from(
      mejaContainer.querySelectorAll("input[type='checkbox']:checked")
    ).map(cb => cb.value);

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