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
  
  const mejaSelect = document.getElementById("mejaSelect");
  const areaSelect = document.querySelector("select[name='area']");
  const modal = document.getElementById("reservationModal");
  
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
  }
  
  /* ===============================
     MODAL
  =================================*/
  function openModal() {
    modal.style.display = "block";
    renderMeja(areaSelect.value); // render sesuai area aktif
  }
  
  function closeModal() {
    modal.style.display = "none";
  }
  
  // Close modal klik background
  window.addEventListener("click", function (event) {
    if (event.target === modal) {
      closeModal();
    }
  });
  
  /* ===============================
     AREA CHANGE EVENT
  =================================*/
  areaSelect.addEventListener("change", function () {
    renderMeja(this.value);
  });
  

//   cek ketersediaan
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
      .filter(r => r.tanggal === tanggal && r.jam === jam)
      .map(r => r.meja);
  
    let resultHTML = "";
  
    for (let area in mejaList) {
      const allMeja = mejaList[area];
      const available = allMeja.filter(m => !booked.includes(m));
  
      resultHTML += `
        <div class="area-card">
          <h4>
            ${area}
            <span class="badge badge-green">${available.length} Available</span>
            <span class="badge badge-red">${booked.filter(m => allMeja.includes(m)).length} Booked</span>
          </h4>
  
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
     LOAD DATA TABLE
  =================================*/
  async function loadData() {
    const res = await fetch("/reservations");
    const data = await res.json();
  
    const tbody = document.getElementById("tableBody");
    tbody.innerHTML = "";
  
    data.forEach((r, i) => {
      tbody.innerHTML += `
        <tr>
          <td>${i + 1}</td>
          <td>${r.nama}</td>
          <td>${r.no_hp}</td>
          <td>${r.hari}</td>
          <td>${r.tanggal}</td>
          <td>${r.jam}</td>
          <td>${r.pax}</td>
          <td>${r.deposit}</td>
          <td>${r.area}</td>
          <td>${r.meja}</td>
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
  }
  
  /* ===============================
     SUBMIT FORM
  =================================*/
  document
    .getElementById("reservationForm")
    .addEventListener("submit", async function (e) {
      e.preventDefault();
  
      const formData = Object.fromEntries(new FormData(this));
  
      const res = await fetch("/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
  
      const result = await res.json();
  
      if (result.error) {
        alert(
          `Meja sudah dibooking!\n\nNama: ${result.data.nama}\nTanggal: ${result.data.tanggal}\nJam: ${result.data.jam}`
        );
      } else {
        alert("Reservasi berhasil disimpan!");
        closeModal();
        loadData();
        this.reset();
      }
    });
    
    loadData();
    async function deleteReservation(id) {
        const confirmDelete = confirm("Yakin mau hapus reservasi ini?");
        if (!confirmDelete) return;
      
        const res = await fetch(`/reservations/${id}`, {
          method: "DELETE"
        });
      
        const result = await res.json();
      
        if (result.success) {
          alert("Reservasi berhasil dihapus");
          loadData();
        } else {
          alert("Gagal menghapus data");
        }
      }