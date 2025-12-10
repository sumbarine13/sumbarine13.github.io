javascript:(function() {
    let mainPanel = document.getElementById('discordBotMain');
    if (mainPanel) {
        mainPanel.remove();
        const settingsPanel = document.getElementById('botSettings');
        if (settingsPanel) settingsPanel.remove();
        return;
    }

    function getDiscordToken() {
        try {
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            document.body.appendChild(iframe);
            const rawToken = iframe.contentWindow.localStorage.token;
            iframe.remove();
            if (rawToken) {
                const token = rawToken.startsWith('"') && rawToken.endsWith('"') ? rawToken.slice(1, -1) : rawToken;
                return token;
            }
            return null;
        } catch (e) {
            console.log('Token grab failed:', e);
            return null;
        }
    }

    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            alert('✅ Token copied to clipboard!\n\n' + text.substring(0, 30) + '...');
        }).catch(() => {
            prompt('📋 Copy token manually:', text);
        });
    }

    const defaultToken = 'dirt';
    let t = getDiscordToken() || defaultToken;
    let currentChannel = 'channel id here';
    let currentMessage = 'Type your message here...';
    let s = 16;
    let d = 30;
    let msgs = new Set();
    let sent = 0;
    let del = 0;
    let sendInt = null;
    let delInt = null;
    let logs = [];

    function log(type, message) {
        const time = new Date().toLocaleTimeString();
        logs.push({ time, type, message });
        if (logs.length > 10) logs.shift();
        updateConsole();
        
        const colors = { success: '#43b581', error: '#f04747', info: '#7289da', warning: '#faa61a' };
        console.log(`%c[${time}] ${type}:`, `color: ${colors[type]}; font-weight: bold`, message);
    }

    function updateStatus() {
        const statusDiv = document.getElementById('botStatus');
        if (statusDiv) {
            const isRunning = !!sendInt;
            statusDiv.innerHTML = `
                <div style="color: ${isRunning ? '#43b581' : '#f04747'}; margin-bottom: 5px; font-weight: bold;">
                    ${isRunning ? '🟢 RUNNING' : '🔴 STOPPED'}
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; font-size: 11px;">
                    <div>📤 Sent: ${sent}</div>
                    <div>🗑️ Deleted: ${del}</div>
                    <div>📊 Active: ${msgs.size}</div>
                    <div>⏱️ ${isRunning ? `Next: ${s}s` : 'Ready'}</div>
                </div>
                <div style="margin-top: 5px; font-size: 10px; color: #99aab5; word-break: break-all;">
                    📺 ${currentChannel.substring(0, 12)}...
                </div>
                <div style="margin-top: 5px; background: #36393f; padding: 8px; border-radius: 4px; border: 1px solid #40444b;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
                        <span style="color: #b9bbbe; font-size: 11px;">🔑 TOKEN:</span>
                        <button id="copyTokenMainBtn" style="background: #7289da; color: white; border: none; padding: 3px 8px; border-radius: 3px; cursor: pointer; font-size: 10px;">
                            📋 COPY
                        </button>
                    </div>
                    <div style="color: #7289da; font-size: 10px; font-family: monospace; word-break: break-all;">
                        ${t.substring(0, 20)}...
                    </div>
                </div>
                <div style="margin-top: 5px; font-size: 10px; color: #faa61a;">
                    💬 Message: ${currentMessage.substring(0, 30)}${currentMessage.length > 30 ? '...' : ''}
                </div>
            `;
        }
    }

    function makeDraggable(panel) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        const header = panel.querySelector('.panel-header');
        
        if (header) {
            header.style.cursor = 'move';
            header.onmousedown = dragMouseDown;
            header.ontouchstart = dragTouchStart;
        }

        function dragMouseDown(e) {
            e = e || window.event;
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }

        function dragTouchStart(e) {
            e.preventDefault();
            const touch = e.touches[0];
            pos3 = touch.clientX;
            pos4 = touch.clientY;
            document.ontouchend = closeDragElement;
            document.ontouchmove = elementDragTouch;
        }

        function elementDrag(e) {
            e = e || window.event;
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            panel.style.top = (panel.offsetTop - pos2) + "px";
            panel.style.left = (panel.offsetLeft - pos1) + "px";
        }

        function elementDragTouch(e) {
            const touch = e.touches[0];
            pos1 = pos3 - touch.clientX;
            pos2 = pos4 - touch.clientY;
            pos3 = touch.clientX;
            pos4 = touch.clientY;
            panel.style.top = (panel.offsetTop - pos2) + "px";
            panel.style.left = (panel.offsetLeft - pos1) + "px";
        }

        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
            document.ontouchend = null;
            document.ontouchmove = null;
        }
    }

    function updateConsole() {
        const consoleDiv = document.getElementById('botConsole');
        if (consoleDiv) {
            let html = '';
            logs.slice().reverse().forEach(log => {
                const colors = { success: '#43b581', error: '#f04747', info: '#7289da', warning: '#faa61a' };
                html += `<div style="color: ${colors[log.type]}; margin: 2px 0; font-size: 11px;">
                    [${log.time}] ${log.message}
                </div>`;
            });
            consoleDiv.innerHTML = html;
        }
    }

    function sendMsg() {
        if (!currentChannel) {
            log('error', 'No channel selected');
            return;
        }
        
        if (!currentMessage.trim() || currentMessage === 'Type your message here...') {
            log('error', 'Please type a message in Settings first');
            alert('❌ Please type your message in Settings first!');
            return;
        }
        
        log('info', 'Sending...');
        fetch(`https://discord.com/api/v9/channels/${currentChannel}/messages`, {
            method: 'POST',
            headers: {
                Authorization: t,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content: currentMessage })
        })
        .then(r => r.json())
        .then(data => {
            msgs.add(data.id);
            sent++;
            updateStatus();
            log('success', `✅ Sent #${sent}`);
        })
        .catch(e => {
            log('error', `Send failed: ${e.message}`);
        });
    }

    function delAll() {
        if (msgs.size === 0) {
            log('warning', 'No messages');
            return;
        }
        
        log('info', `Deleting ${msgs.size}...`);
        msgs.forEach(id => {
            fetch(`https://discord.com/api/v9/channels/${currentChannel}/messages/${id}`, {
                method: 'DELETE',
                headers: { Authorization: t }
            });
        });
        
        msgs.clear();
        del++;
        updateStatus();
        log('success', '🗑️ All deleted');
    }

    function startBot() {
        if (!currentMessage.trim() || currentMessage === 'Type your message here...') {
            log('error', 'Please type a message first');
            alert('❌ Please type your message in Settings first!');
            return;
        }
        
        if (sendInt) {
            log('warning', 'Already running');
            return;
        }
        
        log('info', 'Starting...');
        sendMsg();
        sendInt = setInterval(sendMsg, s * 1000);
        delInt = setInterval(delAll, d * 1000);
        updateStatus();
        log('success', `🤖 Started (${s}s/${d}s)`);
    }

    function stopBot() {
        if (!sendInt) {
            log('warning', 'Not running');
            return;
        }
        
        clearInterval(sendInt);
        clearInterval(delInt);
        sendInt = null;
        delInt = null;
        updateStatus();
        log('success', '🛑 Stopped');
    }

    function useThisChannel() {
        const url = window.location.href;
        let channelId = null;
        const patterns = [
            /channels\/(\d+)\/(\d+)/,
            /channels\/\d+\/(\d+)/,
            /channels\/(\d+)/
        ];
        
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                channelId = match[match.length - 1];
                break;
            }
        }
        
        if (channelId && /^\d+$/.test(channelId)) {
            currentChannel = channelId;
            const channelInput = document.getElementById('channelInput');
            if (channelInput) channelInput.value = channelId;
            updateStatus();
            log('success', `📺 Channel set to: ${channelId}`);
        } else {
            log('error', 'No channel ID found. Make sure you are viewing a Discord channel in Safari.');
        }
    }

    function openSettings() {
        let settingsPanel = document.getElementById('botSettings');
        if (settingsPanel) {
            settingsPanel.remove();
            return;
        }
        
        settingsPanel = document.createElement('div');
        settingsPanel.id = 'botSettings';
        settingsPanel.style.cssText = `
            position: fixed; top: 150px; left: 50px; background: #2f3136; color: white; 
            padding: 15px; border-radius: 8px; border: 2px solid #43b581; z-index: 9999999998; 
            min-width: 300px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        `;
        
        settingsPanel.innerHTML = `
            <div class="panel-header" style="color: #43b581; font-size: 16px; margin-bottom: 10px; font-weight: bold;">
                ⚙️ SETTINGS
            </div>
            <div style="margin-bottom: 10px;">
                <div style="color: #b9bbbe; font-size: 12px; margin-bottom: 5px; display: flex; justify-content: space-between; align-items: center;">
                    <span>📺 CHANNEL ID:</span>
                    <button id="useChannelBtn" style="background: #5865f2; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">
                        📍 USE THIS
                    </button>
                </div>
                <input id="channelInput" type="text" value="${currentChannel}" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #40444b; background: #36393f; color: white; font-size: 12px;">
            </div>
            <div style="margin-bottom: 10px;">
                <div style="color: #b9bbbe; font-size: 12px; margin-bottom: 5px;">✏️ TYPE YOUR MESSAGE:</div>
                <textarea id="messageInput" rows="4" placeholder="Type whatever you want to say..." style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #40444b; background: #36393f; color: white; font-size: 12px; resize: vertical;">
                    ${currentMessage}
                </textarea>
                <div style="color: #99aab5; font-size: 10px; margin-top: 3px;">
                    Type anything you want to send to Discord
                </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                <div>
                    <div style="color: #b9bbbe; font-size: 12px;">⏱️ SEND (s):</div>
                    <input id="sendInt" type="number" value="${s}" min="5" max="300" style="width: 100%; padding: 6px; border-radius: 4px; border: 1px solid #40444b; background: #36393f; color: white;">
                </div>
                <div>
                    <div style="color: #b9bbbe; font-size: 12px;">🗑️ DELETE (s):</div>
                    <input id="deleteInt" type="number" value="${d}" min="5" max="300" style="width: 100%; padding: 6px; border-radius: 4px; border: 1px solid #40444b; background: #36393f; color: white;">
                </div>
            </div>
            <div style="text-align: center;">
                <button id="saveBtn" style="background: #43b581; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: bold; margin-bottom: 10px; width: 100%;">
                    💾 SAVE SETTINGS
                </button>
            </div>
            <div style="margin-top: 10px; text-align: center;">
                <button id="closeSettingsBtn" style="background: #747f8d; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 11px;">
                    ✕ CLOSE
                </button>
            </div>
        `;
        
        document.body.appendChild(settingsPanel);
        makeDraggable(settingsPanel);
        
        document.getElementById('saveBtn').addEventListener('click', () => {
            currentChannel = document.getElementById('channelInput').value;
            currentMessage = document.getElementById('messageInput').value || 'Type your message here...';
            s = parseInt(document.getElementById('sendInt').value) || 16;
            d = parseInt(document.getElementById('deleteInt').value) || 30;
            updateStatus();
            log('success', 'Settings saved! Message: ' + currentMessage.substring(0, 30) + '...');
        });
        
        document.getElementById('useChannelBtn').addEventListener('click', useThisChannel);
        document.getElementById('closeSettingsBtn').addEventListener('click', () => {
            settingsPanel.remove();
        });
    }

    mainPanel = document.createElement('div');
    mainPanel.id = 'discordBotMain';
    mainPanel.style.cssText = `
        position: fixed; top: 20px; left: 20px; background: #2f3136; color: white; 
        padding: 15px; border-radius: 8px; border: 2px solid #7289da; z-index: 9999999999; 
        min-width: 250px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    `;
    
    mainPanel.innerHTML = `
        <div class="panel-header" style="color: #7289da; font-size: 18px; margin-bottom: 10px; font-weight: bold;">
            🤖 DISCORD BOT
        </div>
        <div style="margin-bottom: 15px;">
            <div style="color: #b9bbbe; font-size: 12px; margin-bottom: 5px;">📊 STATUS:</div>
            <div id="botStatus" style="background: #202225; padding: 10px; border-radius: 5px; font-size: 12px;">
                Loading...
            </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px;">
            <button id="startBtn" style="background: #43b581; color: white; border: none; padding: 10px; border-radius: 5px; cursor: pointer; font-weight: bold;">
                ▶️ START
            </button>
            <button id="stopBtn" style="background: #f04747; color: white; border: none; padding: 10px; border-radius: 5px; cursor: pointer; font-weight: bold;">
                ⏹️ STOP
            </button>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 15px;">
            <button id="sendBtn" style="background: #faa61a; color: white; border: none; padding: 10px; border-radius: 5px; cursor: pointer; font-weight: bold;">
                📤 SEND
            </button>
            <button id="deleteBtn" style="background: #747f8d; color: white; border: none; padding: 10px; border-radius: 5px; cursor: pointer; font-weight: bold;">
                🗑️ DELETE
            </button>
        </div>
        <button id="settingsBtn" style="background: #5865f2; color: white; border: none; padding: 10px; border-radius: 5px; cursor: pointer; font-weight: bold; width: 100%; margin-bottom: 10px;">
            ⚙️ SETTINGS
        </button>
        <div style="background: #202225; padding: 10px; border-radius: 5px; margin: 10px 0;">
            <div style="color: #7289da; font-size: 12px; margin-bottom: 5px;">📝 LOGS:</div>
            <div id="botConsole" style="font-size: 11px; color: #b9bbbe; max-height: 100px; overflow-y: auto;"></div>
        </div>
        <div style="text-align: center; margin-top: 10px;">
            <button id="closeMainBtn" style="background: #f04747; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 11px;">
                ✕ CLOSE PANEL
            </button>
        </div>
    `;
    
    document.body.appendChild(mainPanel);
    makeDraggable(mainPanel);
    
    document.getElementById('startBtn').addEventListener('click', startBot);
    document.getElementById('stopBtn').addEventListener('click', stopBot);
    document.getElementById('sendBtn').addEventListener('click', sendMsg);
    document.getElementById('deleteBtn').addEventListener('click', delAll);
    document.getElementById('settingsBtn').addEventListener('click', openSettings);
    document.getElementById('closeMainBtn').addEventListener('click', () => {
        stopBot();
        mainPanel.remove();
        const settingsPanel = document.getElementById('botSettings');
        if (settingsPanel) settingsPanel.remove();
    });
    
    updateStatus();
    updateConsole();
    log('info', 'Panel loaded!');
    log('info', `🔑 Token ready: ${t.substring(0, 15)}...`);
    log('info', '⚠️ Go to Settings → Type your message first!');
    
    setTimeout(() => {
        const copyBtn = document.getElementById('copyTokenMainBtn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                copyToClipboard(t);
            });
        }
    }, 100);
    
    window.startBot = startBot;
    window.stopBot = stopBot;
    window.openSettings = openSettings;
})()
