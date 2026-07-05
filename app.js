// === APP LOGIC ===
const splash = document.getElementById('splash');
const listView = document.getElementById('list-view');
const mapView = document.getElementById('map-view');
const btnEnter = document.getElementById('btn-enter');
const btnBack = document.getElementById('btn-back');
const kostList = document.getElementById('kost-list');
const narasiContent = document.getElementById('narasi-content');

let map = null;
let currentFilter = 'all';

// === NAVIGATION ===
btnEnter.addEventListener('click', () => {
    splash.classList.add('hidden');
    listView.classList.remove('hidden');
    renderKostList();
});

// No session cache - WA & GMaps already open in new tab via target="_blank"

btnBack.addEventListener('click', () => {
    mapView.classList.add('hidden');
    listView.classList.remove('hidden');
    if (map) { map.remove(); map = null; }
});

// === FILTER ===
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.zone;
        renderKostList();
    });
});

// === HELPERS ===
function getZone(alamat) {
    const a = alamat.toLowerCase();
    if (a.includes('kebayoran') || a.includes('pulo raya') || a.includes('melawai') || a.includes('blok m') || a.includes('sungai sambas') || a.includes('kemang') || a.includes('bangka')) return 'Kebayoran Baru';
    if (a.includes('setiabudi') || a.includes('karet') || a.includes('kuningan') || a.includes('tebet')) return 'Setiabudi';
    if (a.includes('tanah abang') || a.includes('kebon kacang') || a.includes('thamrin') || a.includes('bendungan hilir') || a.includes('benhil') || a.includes('danau toba')) return 'Tanah Abang';
    if (a.includes('mampang') || a.includes('tendean')) return 'Setiabudi';
    return 'Kebayoran Baru';
}

function getZoneClass(zona) {
    if (zona.includes('Kebayoran')) return 'zone-kebayoran';
    if (zona.includes('Setiabudi')) return 'zone-setiabudi';
    return 'zone-tanah-abang';
}

function getShortHarga(harga) {
    const match = harga.match(/(\d[\d.,]+)/);
    if (match) {
        const num = match[1].replace(/\./g, '').replace(/,/g, '');
        const val = parseInt(num);
        if (val > 100000) return 'Rp ' + (val/1000000).toFixed(1) + ' jt';
    }
    return harga.substring(0, 30);
}

function hasValidContact(k) {
    return k.kontak && k.kontak !== 'XXX' && k.kontak !== '-' && k.kontak.length > 3;
}

function makeWhatsappLink(kontak) {
    // Extract first phone number
    const match = kontak.match(/(\d[\d\s.\-]{7,})/);
    if (!match) return '#';
    let phone = match[1].replace(/[\s.\-]/g, '');
    if (phone.startsWith('0')) phone = '62' + phone.substring(1);
    if (!phone.startsWith('62')) phone = '62' + phone;
    return `https://api.whatsapp.com/send?phone=${phone}&text=Halo,%20saya%20tertarik%20dengan%20kost%20ini.%20Apakah%20masih%20tersedia?`;
}

// Transport cost estimator
function getTransportOptions(km) {
    const options = [];
    if (km <= 2) {
        options.push({ mode: '🚶 Jalan Kaki', waktu: `${Math.round(km * 12)} menit`, tarif: 'Gratis' });
    }
    options.push({ mode: '🏍️ Ojol (Grab/Gojek)', waktu: `${Math.round(km * 4 + 3)} menit`, tarif: `Rp ${Math.round(km * 4000 + 5000).toLocaleString('id-ID')}` });
    if (km > 1.5) {
        options.push({ mode: '🚌 TransJakarta', waktu: `${Math.round(km * 5 + 8)} menit`, tarif: 'Rp 3.500' });
    }
    if (km > 1) {
        options.push({ mode: '🚇 MRT (jika dekat stasiun)', waktu: `${Math.round(km * 3 + 5)} menit`, tarif: 'Rp 3.000 - 7.000' });
    }
    return options;
}

// Highlight beneficial facilities for karyawan EY/IDX
const BENEFIT_KEYWORDS = ['wifi', 'ac', 'laundry', 'cuci', 'gosok', 'cleaning', 'water heater', 'air panas', 'rooftop', 'smart lock', 'cctv', 'keamanan 24', 'security 24', 'parkir', 'dapur', 'kulkas', 'mesin cuci'];

function formatFasilitas(fasStr) {
    if (!fasStr) return '<span style="color:#999">-</span>';
    // Split by comma or multiple spaces, filter junk
    let items = fasStr.split(/,\s*|\s{2,}/).map(s => s.trim()).filter(s => s.length > 1);
    if (items.length <= 2) items = [fasStr]; // couldn't split well, just show as paragraph
    
    // Group into benefit vs regular, show as compact paragraph
    const benefits = [];
    const regulars = [];
    items.forEach(item => {
        const lower = item.toLowerCase();
        const isBenefit = BENEFIT_KEYWORDS.some(kw => lower.includes(kw));
        if (isBenefit) benefits.push(item);
        else regulars.push(item);
    });
    
    let html = '';
    if (benefits.length > 0) {
        html += `<div style="margin-bottom:6px;"><span style="font-weight:600;color:#4338ca;">⭐ ${benefits.join(' • ')}</span></div>`;
    }
    if (regulars.length > 0) {
        html += `<div style="color:#555;">${regulars.join(' • ')}</div>`;
    }
    return html;
}

// === RENDER LIST ===
function renderKostList() {
    const filtered = currentFilter === 'all' 
        ? ALL_KOST 
        : ALL_KOST.filter(k => getZone(k.alamat) === currentFilter);
    
    kostList.innerHTML = filtered.map(k => {
        const zona = getZone(k.alamat);
        const kontakHtml = hasValidContact(k) 
            ? `<a href="${makeWhatsappLink(k.kontak)}" target="_blank" style="color:#25d366;text-decoration:none;" onclick="event.stopPropagation();">📱 ${k.kontak}</a>`
            : '';
        return `
        <div class="kost-card" data-no="${k.no}">
            <div class="kost-card-header">
                <div class="kost-card-title">${k.no}. ${k.nama}</div>
                <div class="kost-card-price">${getShortHarga(k.harga)}</div>
            </div>
            <div class="kost-card-meta">
                <span>📍 ${k.jarakIDX} km ke IDX</span>
                <span>👤 ${k.tipe}</span>
            </div>
            ${kontakHtml ? `<div class="kost-card-meta" style="margin-top:4px;">${kontakHtml}</div>` : ''}
            <div class="zone-badge ${getZoneClass(zona)}">${zona} • ${k.tanggal}</div>
        </div>`;
    }).join('');

    document.querySelectorAll('.kost-card').forEach(card => {
        card.addEventListener('click', () => {
            const no = parseInt(card.dataset.no);
            const kost = ALL_KOST.find(k => k.no === no);
            if (kost) showMap(kost);
        });
    });
}

// === MAP VIEW ===
function showMap(kost) {
    listView.classList.add('hidden');
    mapView.classList.remove('hidden');

    if (map) { map.remove(); map = null; }
    map = L.map('map').setView([kost.lat, kost.lng], 15);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO'
    }).addTo(map);

    // Kost marker
    L.marker([kost.lat, kost.lng], {
        icon: createLabel('🏠 ' + kost.nama.substring(0, 22), '#eef2ff', '#3730a3')
    }).addTo(map).bindPopup(`<b>${kost.nama}</b><br>${getShortHarga(kost.harga)}/bln`);

    // IDX marker
    L.marker([LANDMARKS.idx.lat, LANDMARKS.idx.lng], {
        icon: createLabel('🏢 Gedung IDX', '#fef2f2', '#991b1b')
    }).addTo(map).bindPopup(`<b>${LANDMARKS.idx.name}</b><br>${LANDMARKS.idx.area}`);

    // JISDAC marker
    L.marker([LANDMARKS.jisdac.lat, LANDMARKS.jisdac.lng], {
        icon: createLabel('📍 JISDAC', '#f0f9ff', '#1e3a5f')
    }).addTo(map).bindPopup(`<b>${LANDMARKS.jisdac.name}</b><br>${LANDMARKS.jisdac.area}`);

    // Route to IDX with KM label and clickable popup
    const routeIDX = L.polyline([[kost.lat, kost.lng], [LANDMARKS.idx.lat, LANDMARKS.idx.lng]], {
        color: '#e63946', weight: 4, opacity: 0.8, dashArray: '10, 8'
    }).addTo(map);

    // Distance label on route to IDX - blinking "click me"
    const midLat = (kost.lat + LANDMARKS.idx.lat) / 2;
    const midLng = (kost.lng + LANDMARKS.idx.lng) / 2;
    const transportOpts = getTransportOptions(kost.jarakIDX);
    const transportPopup = `
        <div style="min-width:200px;">
            <b>🗺️ Jarak ke IDX: ${kost.jarakIDX} km</b>
            <hr style="margin:6px 0;">
            <table style="font-size:12px;width:100%;">
                ${transportOpts.map(t => `<tr><td>${t.mode}</td><td>${t.waktu}</td><td style="text-align:right;font-weight:600;">${t.tarif}</td></tr>`).join('')}
            </table>
            <hr style="margin:6px 0;">
            <span style="font-size:11px;color:#666;">*Estimasi tarif normal (non-surge)</span>
        </div>
    `;
    
    L.marker([midLat, midLng], {
        icon: L.divIcon({
            className: '',
            html: `<div style="background:rgba(230,57,70,0.9);color:white;padding:3px 8px;border-radius:12px;font-size:11px;font-weight:700;cursor:pointer;box-shadow:0 2px 4px rgba(0,0,0,0.3);white-space:nowrap;animation:blink 2s ease-in-out infinite;">${kost.jarakIDX} km 📍</div>`,
            iconAnchor: [28, 12]
        })
    }).addTo(map).bindPopup(transportPopup);
    
    routeIDX.bindPopup(transportPopup);

    // Route to JISDAC with distance label
    const distJISDAC = getDistance(kost.lat, kost.lng, LANDMARKS.jisdac.lat, LANDMARKS.jisdac.lng);
    const transportJISDAC = getTransportOptions(distJISDAC);
    const jisdacPopup = `
        <div style="min-width:200px;">
            <b>🗺️ Jarak ke JISDAC: ${distJISDAC.toFixed(1)} km</b>
            <hr style="margin:6px 0;">
            <table style="font-size:12px;width:100%;">
                ${transportJISDAC.map(t => `<tr><td>${t.mode}</td><td>${t.waktu}</td><td style="text-align:right;font-weight:600;">${t.tarif}</td></tr>`).join('')}
            </table>
        </div>
    `;
    const jisdacRoute = L.polyline([[kost.lat, kost.lng], [LANDMARKS.jisdac.lat, LANDMARKS.jisdac.lng]], {
        color: '#1d3557', weight: 3, opacity: 0.7, dashArray: '8, 6'
    }).addTo(map).bindPopup(jisdacPopup);

    // JISDAC distance label - blinking
    const midLatJ = (kost.lat + LANDMARKS.jisdac.lat) / 2;
    const midLngJ = (kost.lng + LANDMARKS.jisdac.lng) / 2;
    L.marker([midLatJ, midLngJ], {
        icon: L.divIcon({
            className: '',
            html: `<div style="background:rgba(29,53,87,0.9);color:white;padding:3px 8px;border-radius:12px;font-size:11px;font-weight:700;cursor:pointer;box-shadow:0 2px 4px rgba(0,0,0,0.3);white-space:nowrap;animation:blink 2s ease-in-out infinite 0.7s;">${distJISDAC.toFixed(1)} km 📍</div>`,
            iconAnchor: [28, 12]
        })
    }).addTo(map).bindPopup(jisdacPopup);

    // Zona bebas banjir
    FLOOD_FREE_ZONES.forEach(zone => {
        L.polygon(zone.coords, {
            color: zone.color, fillColor: zone.color,
            fillOpacity: 0.08, weight: 1, dashArray: '4, 4'
        }).addTo(map).bindPopup(`<b>${zone.name}</b><br>${zone.desc}`);
    });

    // Facilities
    FACILITIES.forEach(f => {
        const icons = { makan: '🍜', groceries: '🛒', laundry: '👕' };
        const colors = { makan: '#ff6b35', groceries: '#4ecdc4', laundry: '#a855f7' };
        L.marker([f.lat, f.lng], {
            icon: createCircleIcon(icons[f.type], colors[f.type])
        }).addTo(map).bindPopup(`<b>${f.name}</b>`);
    });

    // Fit bounds
    const bounds = L.latLngBounds([
        [kost.lat, kost.lng], [LANDMARKS.idx.lat, LANDMARKS.idx.lng], [LANDMARKS.jisdac.lat, LANDMARKS.jisdac.lng]
    ]);
    map.fitBounds(bounds.pad(0.3));
    addMapLegend();
    renderNarasi(kost);
}

function createLabel(text, bgColor, textColor) {
    return L.divIcon({
        className: '',
        html: `<div style="background:${bgColor};color:${textColor || '#1a1a2e'};padding:5px 10px;border-radius:6px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.25);border:2px solid ${bgColor};">${text}</div>`,
        iconAnchor: [50, 15]
    });
}

function createCircleIcon(emoji, color) {
    return L.divIcon({
        className: '',
        html: `<div style="background:${color};width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;box-shadow:0 2px 4px rgba(0,0,0,0.2);border:2px solid white;">${emoji}</div>`,
        iconSize: [26, 26], iconAnchor: [13, 13]
    });
}

function addMapLegend() {
    const legend = L.control({ position: 'topright' });
    legend.onAdd = function() {
        const div = L.DomUtil.create('div', 'legend-map');
        div.innerHTML = `
            <h4>Keterangan</h4>
            <div class="legend-item"><div class="legend-dot" style="background:#667eea"></div> Kost</div>
            <div class="legend-item"><div class="legend-dot" style="background:#e63946"></div> IDX</div>
            <div class="legend-item"><div class="legend-dot" style="background:#1d3557"></div> JISDAC</div>
            <div class="legend-item"><div class="legend-dot" style="background:#ff6b35"></div> Makan</div>
            <div class="legend-item"><div class="legend-dot" style="background:#4ecdc4"></div> Groceries</div>
            <div class="legend-item"><div class="legend-dot" style="background:#a855f7"></div> Laundry</div>
        `;
        return div;
    };
    legend.addTo(map);
}

// === NARASI PANEL ===
function renderNarasi(kost) {
    const distJISDAC = getDistance(kost.lat, kost.lng, LANDMARKS.jisdac.lat, LANDMARKS.jisdac.lng);

    // Photo gallery
    const fotos = kost.fotos || [];
    const photoHtml = fotos.length > 0
        ? `<div style="display:flex;gap:6px;overflow-x:auto;margin-bottom:12px;padding-bottom:6px;">
            ${fotos.map(url => `<img src="${url}" alt="${kost.nama}" style="width:160px;height:110px;border-radius:8px;object-fit:cover;flex-shrink:0;" onerror="this.style.display='none'">`).join('')}
           </div>`
        : '';

    // Kontak - clickable WhatsApp
    let kontakHtml = '';
    if (hasValidContact(kost)) {
        const waLink = makeWhatsappLink(kost.kontak);
        kontakHtml = `<div class="section-title">📞 Kontak</div>
            <a href="${waLink}" target="_blank" style="display:inline-block;background:#25d366;color:white;padding:8px 16px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600;margin-bottom:8px;">
                💬 WhatsApp: ${kost.kontak}
            </a>`;
    }

    // Transport options
    const transportOpts = getTransportOptions(kost.jarakIDX);
    const transportJISDAC = getTransportOptions(distJISDAC);

    narasiContent.innerHTML = `
        ${photoHtml}
        <h3>${kost.nama}</h3>
        <div class="price-tag">${kost.harga.substring(0, 100)}</div>
        
        ${kontakHtml}

        ${kost.narasi ? `<div class="section-title">💬 Pendapat Aku buat Sadon</div>
        <div class="akses-info" style="border-left-color:#667eea;background:#f5f3ff;">${kost.narasi}</div>` : ''}
        
        <div class="section-title">🗺️ Akses ke IDX (${kost.jarakIDX} km)</div>
        <table style="width:100%;font-size:12px;border-collapse:collapse;margin-bottom:8px;">
            ${transportOpts.map(t => `<tr style="border-bottom:1px solid #f0f0f0;"><td style="padding:6px 0;">${t.mode}</td><td>${t.waktu}</td><td style="text-align:right;font-weight:600;color:#4338ca;">${t.tarif}</td></tr>`).join('')}
        </table>

        <div class="section-title">🗺️ Akses ke JISDAC (${distJISDAC.toFixed(1)} km)</div>
        <table style="width:100%;font-size:12px;border-collapse:collapse;margin-bottom:8px;">
            ${transportJISDAC.map(t => `<tr style="border-bottom:1px solid #f0f0f0;"><td style="padding:6px 0;">${t.mode}</td><td>${t.waktu}</td><td style="text-align:right;font-weight:600;color:#4338ca;">${t.tarif}</td></tr>`).join('')}
        </table>
        
        <div class="section-title">🏠 Info Kost</div>
        <div class="catatan">
            <strong>Tipe:</strong> ${kost.tipe}<br>
            <strong>Ukuran:</strong> ${kost.ukuran || '-'}<br>
            <strong>Jumlah Kamar:</strong> ${kost.jumlah || '-'}<br>
            <strong>Update:</strong> ${kost.tanggal}
        </div>
        
        <div class="section-title">🏪 Fasilitas Kamar</div>
        <div style="font-size:13px;line-height:1.6;">
            ${formatFasilitas(kost.fasilitas)}
        </div>
        
        <div class="section-title">🏢 Fasilitas Umum</div>
        <div style="font-size:13px;line-height:1.6;">
            ${formatFasilitas(kost.fasUmum)}
        </div>
        
        <div class="section-title">📍 Alamat</div>
        <div class="catatan">${kost.alamat}</div>
        
        <a href="https://www.google.com/maps/dir/Gedung+Bursa+Efek+Indonesia+SCBD+Jakarta/${encodeURIComponent(kost.nama + ', ' + kost.alamat.split('.')[0] + ', Jakarta')}" target="_blank" style="display:inline-block;margin-top:12px;background:#4285f4;color:white;padding:10px 18px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600;">
            📍 Rute IDX → Kost di Google Maps
        </a>
    `;
}

function getDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Narasi panel expand/collapse on drag
const narasiPanel = document.getElementById('narasi-panel');
narasiPanel.addEventListener('click', function(e) {
    if (e.target === this || e.target === this.querySelector('#narasi-content')) return;
});
// Toggle expand when clicking the drag handle area (top part)
narasiPanel.addEventListener('click', function(e) {
    const rect = this.getBoundingClientRect();
    if (e.clientY - rect.top < 20) {
        this.classList.toggle('expanded');
    }
});
