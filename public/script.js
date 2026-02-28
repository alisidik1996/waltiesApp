const mejaList = [
    "Sofa Coklat: 5 Seats",
    "Sofa Abu: 7 Seats",
    "Table 3: 4 Seats",
    "Table 2: 4 Seats",
    "Table 1: 4 Seats",
    "Table 4: 2 Seats",
    "Table 5: 2 Seats",
  
    "Table 21: 4 Seats",
    "Table 22: 4 Seats",
    "Table 23: 4 Seats",
    "Table 24: 4 Seats",
    "Table 25: 4 Seats",
    "Table 20: 4 Seats",
    "Sofa Luar: 8 Seats",
  
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
  ];
    
    const mejaSelect = document.getElementById("mejaSelect");
    
    mejaList.forEach(m => {
        const opt = document.createElement("option");
        opt.value = m;
        opt.textContent = m;
        mejaSelect.appendChild(opt);
    });
    
    function showForm() {
        document.getElementById("formContainer").classList.toggle("hidden");
    }
    
    function openModal() {
        document.getElementById("reservationModal").style.display = "block";
    }
    
    function closeModal() {
        document.getElementById("reservationModal").style.display = "none";
    }
    
    // Close modal when click outside
    window.onclick = function(event) {
        const modal = document.getElementById("reservationModal");
        if (event.target === modal) {
            closeModal();
        }
    };

    async function loadData() {
        const res = await fetch("/reservations");
        const data = await res.json();
    
        const tbody = document.getElementById("tableBody");
        tbody.innerHTML = "";
    
        data.forEach((r, i) => {
            tbody.innerHTML += `
            <tr>
                <td>${i+1}</td>
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
            </tr>`;
        });
    }
    
    document.getElementById("reservationForm").addEventListener("submit", async function(e) {
        e.preventDefault();
    
        const formData = Object.fromEntries(new FormData(this));
    
        const res = await fetch("/reservations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData)
        });
    
        const result = await res.json();
    
        if (result.error) {
            alert(`Meja sudah dibooking!\n\nNama: ${result.data.nama}\nTanggal: ${result.data.tanggal}\nJam: ${result.data.jam}`);
        } else {
            alert("Reservasi berhasil disimpan!");
            closeModal();
            loadData();
            this.reset();
        }
    });
    
    loadData();