(function() {
    if (document.getElementById('sabet-panel')) return;

    // UI CSS
    var style = document.createElement('style');
    style.innerHTML = `
        #sabet-panel { position: fixed; top: 50px; right: 10px; width: 260px; background: #1a1a1a; border: 2px solid #ff3333; border-radius: 12px; padding: 15px; z-index: 999999; box-shadow: 0 0 20px #ff3333; color: #fff; font-family: Arial; transition: all 0.3s; }
        #sabet-panel.minimized { width: 50px; height: 50px; border-radius: 50%; padding: 0; display: flex; justify-content: center; align-items: center; cursor: pointer; background: #ff3333; }
        #sabet-panel.minimized * { display: none; }
        #sabet-panel.minimized::after { content: 'S'; font-size: 24px; font-weight: bold; color: #fff; display: block; }
        .sabet-q-btn { padding: 5px 8px; background: #222; color: #fff; border: 1px solid #ff3333; border-radius: 4px; cursor: pointer; margin: 0 2px; }
        .sabet-q-btn.active { background: #ff3333; }
        #sabet-scan-btn { width: 100%; padding: 10px; background: #ff3333; color: #fff; border: none; border-radius: 6px; font-weight: bold; font-size: 16px; margin-top: 10px; cursor: pointer; }
        #sabet-scan-btn.scanning { background: #ff8800; animation: pulse 0.5s infinite; }
        #sabet-status { text-align: center; font-size: 12px; margin-top: 10px; color: #aaa; }
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.6; } 100% { opacity: 1; } }
    `;
    document.head.appendChild(style);

    // UI HTML
    var panel = document.createElement('div');
    panel.id = 'sabet-panel';
    panel.innerHTML = `
        <h3 style="text-align:center; color:#ff3333; margin:0 0 10px;">SABET AUTO</h3>
        <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
            <button class="sabet-q-btn" data-q="1">1</button>
            <button class="sabet-q-btn" data-q="5">5</button>
            <button class="sabet-q-btn active" data-q="10">10</button>
            <button class="sabet-q-btn" data-q="20">20</button>
            <button class="sabet-q-btn" data-q="50">50</button>
            <button class="sabet-q-btn" data-q="100">100</button>
        </div>
        <button id="sabet-scan-btn">SCAN & TRADE</button>
        <div id="sabet-status">Ready</div>
    `;
    document.body.appendChild(panel);

    // Drag Logic (Making it movable)
    let isDragging = false, offsetX, offsetY;
    panel.addEventListener('mousedown', (e) => {
        isDragging = true;
        offsetX = e.clientX - panel.getBoundingClientRect().left;
        offsetY = e.clientY - panel.getBoundingClientRect().top;
    });
    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            panel.style.left = (e.clientX - offsetX) + 'px';
            panel.style.top = (e.clientY - offsetY) + 'px';
            panel.style.right = 'auto';
        }
    });
    document.addEventListener('mouseup', () => isDragging = false);

    // Minimize Logic
    const header = panel.querySelector('h3');
    header.style.cursor = 'pointer';
    header.title = 'Click to minimize/maximize';
    header.onclick = () => panel.classList.toggle('minimized');
    panel.onclick = (e) => {
        if (panel.classList.contains('minimized')) panel.classList.remove('minimized');
    };

    // Quantity Selection
    let activeQ = '10';
    const qBtns = panel.querySelectorAll('.sabet-q-btn');
    qBtns.forEach(btn => {
        btn.onclick = function() {
            qBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            activeQ = this.getAttribute('data-q');
        };
    });

    // Main Scan & Trade Logic
    const API = 'https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json?ts=';
    const status = document.getElementById('sabet-status');
    const scanBtn = document.getElementById('sabet-scan-btn');

    scanBtn.onclick = function() {
        if (this.classList.contains('scanning')) return;
        this.classList.add('scanning');
        this.innerText = 'SCANNING...';
        status.innerText = 'Scanning 40 Markets...';
        status.style.color = '#ffd700';

        let timeLeft = 5;
        const timer = setInterval(() => {
            timeLeft--;
            status.innerText = `Scanning... ${timeLeft}s`;
            if (timeLeft <= 0) {
                clearInterval(timer);
                executeTrade();
            }
        }, 1000);
    };

    async function executeTrade() {
        try {
            const res = await fetch(API + Date.now());
            const data = await res.json();
            const list = data.data.list.slice(0, 40);
            
            // Simple Strategy Logic
            let bigs = 0, smalls = 0, streak = 0, last = parseInt(list[0].number) >= 5;
            list.forEach((x, i) => {
                let isB = parseInt(x.number) >= 5;
                if (isB) bigs++; else smalls++;
                if (isB === last && i < 5) streak++;
            });

            let isBig;
            if (streak >= 3) isBig = !last; // Streak Break
            else if (bigs > smalls + 5) isBig = false; // Trend Reversal
            else if (smalls > bigs + 5) isBig = true;
            else isBig = !last; // Alternate

            status.innerText = `Signal: ${isBig ? 'BIG' : 'SMALL'}`;
            status.style.color = '#ff3333';

            // 1. Click Big/Small
            clickBtnByText(isBig ? 'BIG' : 'SMALL');
            
            setTimeout(() => {
                // 2. Click Quantity
                clickBtnByText(activeQ);
                
                setTimeout(() => {
                    // 3. Click Total Amount
                    clickBtnByText('Total amount');
                    status.innerText = '✅ Trade Placed!';
                    status.style.color = '#00ff88';
                    resetBtn();
                }, 1000);
            }, 1000);

        } catch (e) {
            status.innerText = 'Error fetching API';
            status.style.color = '#ff3333';
            resetBtn();
        }
    }

    function clickBtnByText(text) {
        const elements = document.querySelectorAll('div, span, button');
        for (let el of elements) {
            if (el.innerText && el.innerText.trim().toUpperCase() === text.toUpperCase() && el.offsetParent !== null) {
                // Skip if it's the "Balance" section (we only want the bottom ones)
                if (el.parentElement && el.parentElement.innerText.includes('Balance')) continue;
                el.click();
                return;
            }
        }
    }

    function resetBtn() {
        scanBtn.classList.remove('scanning');
        scanBtn.innerText = 'SCAN & TRADE';
        setTimeout(() => { status.innerText = 'Ready'; status.style.color = '#aaa'; }, 3000);
    }
})();
