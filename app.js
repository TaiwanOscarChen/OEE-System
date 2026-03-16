// ==========================================
// 模組 0：Supabase 連線設定 (後續解鎖使用)
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

// 暫存資料陣列：存放正在編輯機台的「停機明細」
let tempDowntimeDetails = [];
// 暫存資料陣列：存放今日已儲存的「所有機台報工紀錄」
let todaySavedRecords = []; 

// ==========================================
// 模組 2：畫面初始化與基礎互動
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    // 日期預設為今天
    const today = new Date().toISOString().split('T')[0];
    document.getElementById("workDate").value = today;
    document.getElementById("displayDate").innerText = today;

    // 載入線別選單
    const lineSelect = document.getElementById("lineSelect");
    lineSelect.innerHTML = `<option value="">請選擇線別</option>`;
    sysConfig.lines.forEach(line => lineSelect.innerHTML += `<option value="${line}">${line}</option>`);

    // 載入停機原因選單
    const reasonSelect = document.getElementById("downtimeReason");
    reasonSelect.innerHTML = `<option value="">請選擇停機項目</option>`;
    sysConfig.reasons.forEach(r => {
        let tag = r.type === "計畫" ? "[計畫]" : "[異常]";
        reasonSelect.innerHTML += `<option value="${r.name}|${r.type}">${tag} ${r.name}</option>`;
    });
});

// 切換分頁邏輯
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
// 模組 3：明細表新增與儲存邏輯 (Master-Detail)
// ==========================================

// 點擊「加入停機」
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

    // 推入暫存明細陣列
    tempDowntimeDetails.push({ reason: reasonName, type: reasonType, mins: totalMins });
    
    // 清空輸入框
    document.getElementById("downtimeHrs").value = '';
    document.getElementById("downtimeMins").value = '';
    
    renderTempDowntimeList();
}

// 渲染暫存的明細列表
function renderTempDowntimeList() {
    const listDiv = document.getElementById("tempDowntimeList");
    listDiv.innerHTML = '';
    let totalMins = 0;

    tempDowntimeDetails.forEach((item, index) => {
        totalMins += item.mins;
        let cssClass = item.type === "計畫" ? "tag-planned" : "tag-unplanned";
        let prefix = item.type === "計畫" ? "[計]" : "[非]";
        
        listDiv.innerHTML += `
            <div class="temp-item">
                <span><span class="${cssClass}">${prefix}</span> ${item.reason}</span>
                <span>
                    <strong>${item.mins}</strong> 分鐘 
                    <button class="btn-danger" style="margin-left:10px;" onclick="removeTempDetail(${index})">刪除</button>
                </span>
            </div>
        `;
    });

    if(tempDowntimeDetails.length === 0) {
        listDiv.innerHTML = '<span style="color:#999;">目前無停機明細</span>';
    }

    document.getElementById("currentTotalDowntime").innerText = `此機台總停機：${totalMins} 分鐘`;
}

// 刪除單筆暫存明細
function removeTempDetail(index) {
    tempDowntimeDetails.splice(index, 1);
    renderTempDowntimeList();
}

// 點擊「儲存此機台紀錄」：打包主檔與明細，送到下方總表
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

    // 計算總工時
    let totalWorkMins = (endH - startH) * 60;
    if (!hasBreak) { totalWorkMins -= 60; } // 預設扣除 60 分鐘休息

    // 打包資料
    const recordData = {
        line: line,
        machine: machine,
        operator: operator,
        timeRange: `${startH}:00 ~ ${endH}:00`,
        totalWorkMins: totalWorkMins,
        details: [...tempDowntimeDetails] // 複製明細陣列
    };

    // 未來這裡可以加入 supabase.from('machine_logs').insert(...)

    todaySavedRecords.push(recordData);
    alert(`✅ 已成功儲存 ${machine} 的報工紀錄！`);
    
    // 清空暫存與重置畫面
    tempDowntimeDetails = [];
    document.getElementById("machineSelect").value = "";
    renderTempDowntimeList();
    renderDailyTable();
}

// 渲染下方「今日已輸入紀錄」總表
function renderDailyTable() {
    const tbody = document.getElementById("dailyTableBody");
    tbody.innerHTML = '';

    if(todaySavedRecords.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #999;">尚未儲存任何機台紀錄</td></tr>';
        return;
    }

    todaySavedRecords.forEach((record, index) => {
        let detailsHtml = '';
        let totalDowntime = 0;
        
        record.details.forEach(detail => {
            let cssClass = detail.type === "計畫" ? "tag-planned" : "tag-unplanned";
            let prefix = detail.type === "計畫" ? "[計]" : "[非]";
            detailsHtml += `<div style="margin-bottom:4px;"><span class="${cssClass}">${prefix}</span> ${detail.reason}: ${detail.mins}分</div>`;
            totalDowntime += detail.mins;
        });

        tbody.innerHTML += `
            <tr>
                <td>${record.line}</td>
                <td><strong>${record.machine}</strong></td>
                <td>${record.operator}</td>
                <td>${record.timeRange}</td>
                <td>${detailsHtml || '<span style="color:#999;">無停機</span>'}</td>
                <td style="color:red; font-weight:bold; font-size:16px;">${totalDowntime}</td>
                <td><button class="btn-danger" onclick="deleteSavedRecord(${index})">刪除</button></td>
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
