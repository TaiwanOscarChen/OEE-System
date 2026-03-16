// ==========================================
// 模組 0：Supabase 連線設定 (沿用你設定好的金鑰)
// ==========================================
const SUPABASE_URL = 'https://mmqsgkqpfpriwxztlxxc.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_N_Srv_Q8WkoCq6Q_z1mp2g_JCCPQf73'; 
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ==========================================
// 模組 1：系統參數設定 (基礎防呆資料庫)
// ==========================================
const sysConfig = {
    lines: ["SMT線", "雷切線", "DAF線", "結構組裝線"],
    machines: {
        "SMT線": ["SPG 印刷機", "SPI 錫膏檢查機", "NPM 貼片機", "RTU 迴焊爐", "AOI 檢測機", "UF 點膠機", "FU 點膠機"],
        "雷切線": ["雷切機(1)", "雷切機(2)"],
        "DAF線": ["DAF機(1)", "DAF機(2)", "PASMA清洗機", "1000x1300 脫泡機", "RD 點膠機"]
    },
    reasons: [
        { name: "設備保養", type: "計畫" },
        { name: "人員休息", type: "計畫" },
        { name: "晨會", type: "計畫" },
        { name: "換線/調機", type: "非計畫" },
        { name: "首件", type: "非計畫" },
        { name: "暖機/回溫", type: "非計畫" },
        { name: "換料待機", type: "非計畫" },
        { name: "設備故障", type: "非計畫" }
    ]
};

let tempDowntimeDetails = [];
let todaySavedRecords = []; 

// ==========================================
// 模組 2：畫面初始化與基礎互動
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById("workDate").value = today;
    document.getElementById("displayDate").innerText = today;

    const lineSelect = document.getElementById("lineSelect");
    lineSelect.innerHTML = `<option value="">請選擇線別</option>`;
    sysConfig.lines.forEach(line => lineSelect.innerHTML += `<option value="${line}">${line}</option>`);

    const reasonSelect = document.getElementById("downtimeReason");
    reasonSelect.innerHTML = `<option value="">請選擇停機項目</option>`;
    sysConfig.reasons.forEach(r => {
        let icon = r.type === "計畫" ? "🟢" : "🔴";
        reasonSelect.innerHTML += `<option value="${r.name}|${r.type}">${icon} [${r.type}] ${r.name}</option>`;
    });
});

function updateMachineList() {
    const line = document.getElementById("lineSelect").value;
    const machineSelect = document.getElementById("machineSelect");
    machineSelect.innerHTML = `<option value="">請先選擇機台</option>`;
    if(sysConfig.machines[line]) {
        sysConfig.machines[line].forEach(m => machineSelect.innerHTML += `<option value="${m}">${m}</option>`);
    }
}

// ==========================================
// 模組 3：明細表新增與儲存邏輯 (結合 Bootstrap UI)
// ==========================================
function addDowntimeDetail() {
    const reasonVal = document.getElementById("downtimeReason").value;
    const hrs = parseInt(document.getElementById("downtimeHrs").value) || 0;
    const mins = parseInt(document.getElementById("downtimeMins").value) || 0;
    const totalMins = (hrs * 60) + mins;

    if(!reasonVal || totalMins <= 0) {
        alert("⚠️ 錯誤：請選擇停機項目，並輸入大於 0 的時間！");
        return;
    }

    const [reasonName, reasonType] = reasonVal.split("|");
    tempDowntimeDetails.push({ reason: reasonName, type: reasonType, mins: totalMins });
    
    document.getElementById("downtimeHrs").value = '';
    document.getElementById("downtimeMins").value = '';
    renderTempDowntimeList();
}

function renderTempDowntimeList() {
    const listDiv = document.getElementById("tempDowntimeList");
    listDiv.innerHTML = '';
    let totalMins = 0;

    if(tempDowntimeDetails.length === 0) {
        listDiv.innerHTML = '<div class="text-center text-muted small py-4">目前尚無停機明細</div>';
        document.getElementById("currentTotalDowntime").innerText = `總計：0 分鐘`;
        return;
    }

    tempDowntimeDetails.forEach((item, index) => {
        totalMins += item.mins;
        // 動態給予 UI 標籤顏色
        let badgeClass = item.type === "計畫" ? "bg-secondary" : "bg-danger";
        
        listDiv.innerHTML += `
            <div class="d-flex justify-content-between align-items-center p-2 border-bottom">
                <div>
                    <span class="badge ${badgeClass} me-2">${item.type}</span>
                    <span class="fw-bold text-dark">${item.reason}</span>
                </div>
                <div>
                    <span class="fw-bold text-primary me-3">${item.mins} <small class="text-muted fw-normal">分鐘</small></span>
                    <button class="btn btn-sm btn-outline-danger py-0 px-2" onclick="removeTempDetail(${index})">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
        `;
    });

    document.getElementById("currentTotalDowntime").innerText = `總計：${totalMins} 分鐘`;
}

function removeTempDetail(index) {
    tempDowntimeDetails.splice(index, 1);
    renderTempDowntimeList();
}

function saveMachineRecord() {
    const line = document.getElementById("lineSelect").value;
    const machine = document.getElementById("machineSelect").value;
    const operator = document.getElementById("operatorName").value;
    const startH = parseInt(document.getElementById("startTime").value) || 0;
    const endH = parseInt(document.getElementById("endTime").value) || 0;
    const hasBreak = document.getElementById("hasBreak").checked;

    if(!line || !machine || !operator) {
        alert("⚠️ 錯誤：請確認【線別】、【機台】與【登記人】皆已填寫！");
        return;
    }

    let totalWorkMins = (endH - startH) * 60;
    if (!hasBreak) { totalWorkMins -= 60; } 

    const recordData = {
        line: line,
        machine: machine,
        operator: operator,
        timeRange: `${startH}:00 ~ ${endH}:00`,
        totalWorkMins: totalWorkMins,
        details: [...tempDowntimeDetails] 
    };

    todaySavedRecords.push(recordData);
    alert(`✅ 已成功暫存 ${machine} 的報工紀錄！準備寫入資料庫。`);
    
    tempDowntimeDetails = [];
    document.getElementById("machineSelect").value = "";
    renderTempDowntimeList();
    renderDailyTable();
}

function renderDailyTable() {
    const tbody = document.getElementById("dailyTableBody");
    tbody.innerHTML = '';

    if(todaySavedRecords.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-5 text-muted">尚未儲存任何機台紀錄</td></tr>';
        return;
    }

    todaySavedRecords.forEach((record, index) => {
        let detailsHtml = '';
        let totalDowntime = 0;
        
        record.details.forEach(detail => {
            let badgeClass = detail.type === "計畫" ? "bg-secondary" : "bg-danger";
            detailsHtml += `<div class="mb-1"><span class="badge ${badgeClass} me-1">${detail.type}</span> ${detail.reason}: <span class="fw-bold">${detail.mins}</span> 分</div>`;
            totalDowntime += detail.mins;
        });

        tbody.innerHTML += `
            <tr>
                <td class="ps-4">
                    <div class="text-muted small">${record.line}</div>
                    <div class="fw-bold text-primary">${record.machine}</div>
                </td>
                <td><div class="fw-bold text-dark mt-2">${record.operator}</div></td>
                <td><div class="mt-2 badge bg-light text-dark border">${record.timeRange}</div></td>
                <td>${detailsHtml || '<span class="text-muted">無停機</span>'}</td>
                <td class="text-center"><span class="fs-5 fw-bold text-danger">${totalDowntime}</span></td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-danger mt-1" onclick="deleteSavedRecord(${index})">
                        <i class="fas fa-trash"></i> 刪除
                    </button>
                </td>
            </tr>
        `;
    });
}

function deleteSavedRecord(index) {
    if(confirm("確定要刪除這筆機台紀錄嗎？")) {
        todaySavedRecords.splice(index, 1);
        renderDailyTable();
    }
}
