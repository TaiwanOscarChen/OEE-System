// ==========================================
// 模組 0：Supabase 鑰匙放這裡
// ==========================================
const SUPABASE_URL = 'https://mmqsgkqpfpriwxztlxxc.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_N_Srv_Q8WkoCq6Q_z1mp2g_JCCPQf73'; 
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ==========================================
// 模組 1：系統參數設定
// ==========================================
const sysConfig = {
    lines: ["SMT線", "雷切線", "DAF線", "結構組裝線"],
    machines: {
        "SMT線": ["SPG 印刷機", "SPI 錫膏檢查機", "NPM 貼片機", "RTU 迴焊爐", "AOI 檢測機"],
        "雷切線": ["雷切機(1)", "雷切機(2)"],
        "DAF線": ["DAF機(1)", "DAF機(2)", "Plasma清洗機", "脫泡機"]
    },
    reasons: [
        { name: "設備保養", type: "計畫" },
        { name: "人員休息", type: "計畫" },
        { name: "換線/首件", type: "非計畫" },
        { name: "設備故障", type: "非計畫" },
        { name: "換料待機", type: "非計畫" }
    ]
};

// 暫存本次機台的停機明細
let currentMachineDetails = [];

// ==========================================
// 模組 2：畫面初始化
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    // 日期預設今天
    const today = new Date().toISOString().split('T')[0];
    document.getElementById("workDate").value = today;
    document.getElementById("displayDate").innerText = today;

    // 載入線別選單
    const lineSelect = document.getElementById("lineSelect");
    lineSelect.innerHTML = `<option value="">請選擇線別</option>`;
    sysConfig.lines.forEach(line => lineSelect.innerHTML += `<option value="${line}">${line}</option>`);

    // 載入停機原因選單
    const reasonSelect = document.getElementById("downtimeReason");
    sysConfig.reasons.forEach(r => {
        let tag = r.type === "計畫" ? "[計]" : "[非]";
        reasonSelect.innerHTML += `<option value="${r.name}|${r.type}">${tag} ${r.name}</option>`;
    });
});

// 切換分頁
function switchTab(tabId) {
    document.querySelectorAll('.tab-pane').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');
}

// 連動機台選單
function updateMachineList() {
    const line = document.getElementById("lineSelect").value;
    const machineSelect = document.getElementById("machineSelect");
    machineSelect.innerHTML = `<option value="">請先選擇機台</option>`;
    if(sysConfig.machines[line]) {
        sysConfig.machines[line].forEach(m => machineSelect.innerHTML += `<option value="${m}">${m}</option>`);
    }
}

// ==========================================
// 模組 3：明細表邏輯 (同事設計的核心)
// ==========================================
function addDowntimeRecord() {
    const line = document.getElementById("lineSelect").value;
    const machine = document.getElementById("machineSelect").value;
    const operator = document.getElementById("operatorName").value;
    const reasonVal = document.getElementById("downtimeReason").value;
    const mins = parseInt(document.getElementById("downtimeMins").value);

    // 防呆檢查
    if(!line || !machine || !operator || !reasonVal || isNaN(mins) || mins <= 0) {
        alert("⚠️ 請將基本資料(線別/機台/登記人)與停機內容填寫完整！");
        return;
    }

    const [reasonName, reasonType] = reasonVal.split("|");

    // 推入暫存陣列
    currentMachineDetails.push({ reason: reasonName, type: reasonType, mins: mins });
    document.getElementById("downtimeMins").value = ''; // 清空輸入框
    
    renderTable();
}

function renderTable() {
    const tbody = document.getElementById("dailyTableBody");
    const line = document.getElementById("lineSelect").value;
    const machine = document.getElementById("machineSelect").value;
    const operator = document.getElementById("operatorName").value;
    const startTime = document.getElementById("startTime").value;
    const endTime = document.getElementById("endTime").value;
    
    // 如果沒有明細，清空表格
    if(currentMachineDetails.length === 0) {
        tbody.innerHTML = '';
        document.getElementById("totalDowntimeLabel").innerText = `此機台總停機：0 分鐘`;
        return;
    }

    // 組合停機明細文字與計算總時長
    let detailsHtml = '';
    let totalMins = 0;
    currentMachineDetails.forEach((item, index) => {
        totalMins += item.mins;
        let cssClass = item.type === "計畫" ? "tag-planned" : "tag-unplanned";
        let prefix = item.type === "計畫" ? "[計]" : "[非]";
        detailsHtml += `<span class="${cssClass}">${prefix} ${item.reason} : ${item.mins}分</span><br>`;
    });

    // 繪製表格列 (對齊同事的格式)
    tbody.innerHTML = `
        <tr>
            <td>${line}</td>
            <td><strong>${machine}</strong></td>
            <td>${operator}</td>
            <td>${startTime} ~ ${endTime}</td>
            <td style="line-height: 1.8;">${detailsHtml}</td>
            <td style="color:red; font-weight:bold; font-size:16px;">${totalMins}</td>
            <td style="text-align: center;">
                <button onclick="clearDetails()" style="background:none; border:1px solid #dc3545; color:#dc3545; padding:5px 10px; margin:0 auto;">🗑️ 清空重填</button>
            </td>
        </tr>
    `;

    document.getElementById("totalDowntimeLabel").innerText = `此機台總停機：${totalMins} 分鐘`;
}

function clearDetails() {
    currentMachineDetails = [];
    renderTable();
}

function saveToDatabase() {
    if(currentMachineDetails.length === 0) {
        alert("⚠️ 沒有停機資料可以儲存！");
        return;
    }
    // 這裡準備呼叫 Supabase，先用 Alert 模擬成功
    alert("✅ 準備將這 " + currentMachineDetails.length + " 筆停機原因整合成一包，存入資料庫！(API 尚未開通)");
    clearDetails();
}
