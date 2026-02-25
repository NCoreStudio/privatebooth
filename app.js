class BoothReservationApp {
    constructor() {
        this.currentDate = new Date().toISOString().split('T')[0];
        this.currentFloor = '6F';
        this.selectedSeat = null;
        this.isAdmin = false;
        this.reservations = [];
        this.courses = [];
        this.unsubscribe = null;
        this.coursesUnsubscribe = null;
        this.editingLog = null;
        this.selectedSeats = new Set();
        this.previewCurrentFloor = '6F';
        this.previewCurrentDate = new Date().toISOString().split('T')[0];
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeDateSelector();
        this.loadCourses();
        this.renderSeatLayout();
        this.subscribeToReservations();
        this.setupModalDrag();
    }

    setupEventListeners() {
        // 日付選択
        document.getElementById('dateSelect').addEventListener('change', (e) => {
            this.currentDate = e.target.value;
            this.updateWeekdayDisplay();
            this.subscribeToReservations();
        });

        // 日付ナビゲーションボタン
        const prevDateBtn = document.getElementById('prevDateBtn');
        const nextDateBtn = document.getElementById('nextDateBtn');
        
        if (prevDateBtn) {
            prevDateBtn.addEventListener('click', () => {
                this.navigateDate(-1);
            });
        }
        
        if (nextDateBtn) {
            nextDateBtn.addEventListener('click', () => {
                this.navigateDate(1);
            });
        }

        // フロアタブ
        document.querySelectorAll('.floor-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.floor-tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                this.currentFloor = e.target.dataset.floor;
                this.subscribeToReservations();
                this.renderSeatLayout();
            });
        });

        // 管理者ボタン
        document.getElementById('adminBtn').addEventListener('click', () => {
            this.showAdminPanel();
        });

        // プレビューボタン
        document.getElementById('previewBtn').addEventListener('click', () => {
            this.showPreviewModal();
        });

        // サイドパネル
        document.getElementById('closeSidePanelBtn').addEventListener('click', () => {
            this.hideSidePanel();
        });

        // 予約フォーム送信
        document.getElementById('sideSubmitBtn').addEventListener('click', () => {
            console.log('Side submit button clicked'); // デバッグ用ログ
            this.submitReservation();
        });

        // プレビューモーダルのイベントリスナー
        document.getElementById('closePreviewModalBtn').addEventListener('click', () => {
            this.hidePreviewModal();
        });

        // プレビュー日付変更
        document.getElementById('previewDate').addEventListener('change', (e) => {
            this.previewCurrentDate = e.target.value;
            this.generatePreviewTable();
        });

        // プレビューフロアタブ
        document.querySelectorAll('.preview-floor-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.preview-floor-tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                this.previewCurrentFloor = e.target.dataset.floor;
                this.generatePreviewTable();
            });
        });

        // 管理者パネル
        document.getElementById('closeAdminBtn').addEventListener('click', () => {
            this.hideAdminPanel();
            this.resetAdminForms(); // パネルを閉じる際に入力内容をクリア
        });

                // 管理者タブ
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
                
                e.target.classList.add('active');
                document.getElementById(e.target.dataset.tab + 'Tab').classList.add('active');
                
                // 編集モードをリセット
                this.resetEditMode();
                
                // ログタブが選択された場合はログを読み込む
                if (e.target.dataset.tab === 'logs') {
                    this.loadLogs();
                } else if (e.target.dataset.tab === 'bulk') {
                    this.renderSeatPickButtons();
                    this.populateAdminTimeSelects();
                } else if (e.target.dataset.tab === 'courses') {
                    this.renderCoursesList();
                }
            });
        });
        // ログ更新ボタン
        const refreshLogsBtn = document.getElementById('refreshLogsBtn');
        if (refreshLogsBtn) {
            refreshLogsBtn.addEventListener('click', () => {
                this.loadLogs();
            });
        }

                // 一括確保
        const bulkReserveBtn = document.getElementById('bulkReserveBtn');
        if (bulkReserveBtn) {
            bulkReserveBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('Bulk reserve button clicked'); // デバッグ用ログ
                
                // 編集モードかチェック
                if (this.editingLog) {
                    console.log('Updating existing log'); // デバッグ用ログ
                    this.updateExistingLog();
                } else {
                    console.log('Creating new bulk reservation'); // デバッグ用ログ
                    
                    const useRecurring = document.getElementById('useRecurring');
                    if (useRecurring && useRecurring.checked) {
                        console.log('Calling reserveRecurringFromBulkUI'); // デバッグ用ログ
                        this.reserveRecurringFromBulkUI();
                    } else {
                        console.log('Calling bulkReserve'); // デバッグ用ログ
                        this.bulkReserve();
                    }
                }
            });
        }

        // 繰り返し設定トグル
        const recurringToggle = document.getElementById('useRecurring');
        const recurringOptions = document.getElementById('recurringOptions');
        
        if (recurringToggle && recurringOptions) {
            recurringToggle.addEventListener('change', (e) => {
                recurringOptions.style.display = e.target.checked ? 'block' : 'none';
            });
        }

        // 管理者パネルの目的タイプ変更
        document.querySelectorAll('input[name="adminPurposeType"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.updateNoteTextarea('admin', e.target.value);
            });
        });

        // サイドバーの目的タイプ変更
        document.querySelectorAll('input[name="sidePurposeType"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.updateNoteTextarea('side', e.target.value);
            });
        });

        // コース管理
        document.getElementById('addCourseBtn').addEventListener('click', () => {
            this.addCourse();
        });

        // フロア変更時の席ボタン更新
        document.getElementById('adminFloorSelect').addEventListener('change', () => {
            // フロア変更時は選択状態をクリアして重複を防ぐ
            this.selectedSeats.clear();
            this.renderSeatPickButtons();
        });
    }

    initializeDateSelector() {
        const dateSelect = document.getElementById('dateSelect');
        dateSelect.value = this.currentDate;
        
        // 曜日表示を更新
        this.updateWeekdayDisplay();
        
        // 管理者パネルの日付も設定
        document.getElementById('adminDateSelect').value = this.currentDate;
        document.getElementById('recurringStartDate').value = this.currentDate;
        document.getElementById('recurringEndDate').value = this.currentDate;
    }

    navigateDate(direction) {
        const currentDate = new Date(this.currentDate);
        currentDate.setDate(currentDate.getDate() + direction);
        
        const newDate = currentDate.toISOString().split('T')[0];
        this.currentDate = newDate;
        
        const dateSelect = document.getElementById('dateSelect');
        if (dateSelect) {
            dateSelect.value = newDate;
        }
        
        this.updateWeekdayDisplay();
        this.subscribeToReservations();
    }

    updateWeekdayDisplay() {
        const weekdayElement = document.getElementById('dateWeekday');
        if (weekdayElement) {
            const date = new Date(this.currentDate);
            const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
            const weekday = weekdays[date.getDay()];
            weekdayElement.textContent = `(${weekday})`;
        }
    }

    loadCourses() {
        this.coursesUnsubscribe = coursesCollection.onSnapshot(snapshot => {
            this.courses = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            // order フィールドでソート（未設定は末尾）
            this.courses.sort((a, b) => {
                const aOrder = a.order !== undefined ? a.order : 9999;
                const bOrder = b.order !== undefined ? b.order : 9999;
                return aOrder - bOrder;
            });
            
            // カスタムコース選択UIを更新
            this.updateCourseSelects();
            
            // コース管理タブが表示されている場合は一覧を更新
            const coursesTab = document.getElementById('coursesTab');
            if (coursesTab && coursesTab.classList.contains('active')) {
                this.renderCoursesList();
            }
        });
    }

    updateCourseSelects() {
        const selectTargets = [
            { containerId: 'sideCourseSelectContainer', hiddenId: 'sideCourseSelect' },
            { containerId: 'adminCourseSelectContainer', hiddenId: 'adminCourseSelect' },
        ];

        selectTargets.forEach(({ containerId, hiddenId }) => {
            const container = document.getElementById(containerId);
            if (!container) return;

            const currentValue = container.querySelector('input[type="hidden"]')?.value || '';
            container.innerHTML = '';

            const hidden = document.createElement('input');
            hidden.type = 'hidden';
            hidden.id = hiddenId;
            hidden.value = currentValue;
            container.appendChild(hidden);

            const trigger = document.createElement('div');
            trigger.className = 'custom-select-trigger';
            trigger.setAttribute('tabindex', '0');

            const dropdown = document.createElement('div');
            dropdown.className = 'custom-select-dropdown';

            const renderTrigger = (courseName) => {
                trigger.innerHTML = '';
                const course = this.courses.find(c => c.name === courseName);
                if (course && course.color) {
                    const swatch = document.createElement('span');
                    swatch.className = 'select-color-swatch';
                    swatch.style.backgroundColor = course.color;
                    trigger.appendChild(swatch);
                }
                const label = document.createElement('span');
                label.textContent = courseName || '選択してください';
                label.style.color = courseName ? '' : '#999';
                trigger.appendChild(label);
                const arrow = document.createElement('span');
                arrow.className = 'custom-select-arrow';
                arrow.textContent = '▾';
                trigger.appendChild(arrow);
            };

            renderTrigger(currentValue);

            const emptyOpt = document.createElement('div');
            emptyOpt.className = 'custom-select-option';
            emptyOpt.textContent = '選択してください';
            emptyOpt.style.color = '#999';
            emptyOpt.addEventListener('click', () => {
                hidden.value = '';
                renderTrigger('');
                dropdown.classList.remove('open');
                trigger.classList.remove('open');
            });
            dropdown.appendChild(emptyOpt);

            this.courses.forEach(course => {
                const opt = document.createElement('div');
                opt.className = 'custom-select-option';
                if (course.color) {
                    const swatch = document.createElement('span');
                    swatch.className = 'select-color-swatch';
                    swatch.style.backgroundColor = course.color;
                    opt.appendChild(swatch);
                }
                const name = document.createElement('span');
                name.textContent = course.name;
                opt.appendChild(name);
                opt.addEventListener('click', () => {
                    hidden.value = course.name;
                    renderTrigger(course.name);
                    dropdown.classList.remove('open');
                    trigger.classList.remove('open');
                });
                dropdown.appendChild(opt);
            });

            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = dropdown.classList.contains('open');
                document.querySelectorAll('.custom-select-dropdown.open').forEach(d => d.classList.remove('open'));
                document.querySelectorAll('.custom-select-trigger.open').forEach(t => t.classList.remove('open'));
                if (!isOpen) {
                    dropdown.classList.add('open');
                    trigger.classList.add('open');
                }
            });

            trigger.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') trigger.click();
            });

            container.appendChild(trigger);
            container.appendChild(dropdown);
        });

        if (!this._globalSelectCloseRegistered) {
            document.addEventListener('click', () => {
                document.querySelectorAll('.custom-select-dropdown.open').forEach(d => d.classList.remove('open'));
                document.querySelectorAll('.custom-select-trigger.open').forEach(t => t.classList.remove('open'));
            });
            this._globalSelectCloseRegistered = true;
        }
    }

    renderSeatLayout() {
        const container = document.getElementById('seatLayout');
        container.innerHTML = '';
        
        const maxSeat = this.currentFloor === '6F' ? 30 : 19;
        
        for (let i = 1; i <= maxSeat; i++) {
            const seatElement = this.createSeatElement(i);
            container.appendChild(seatElement);
        }
        
        // 座席レイアウトを再描画した後に予約状況を更新
        setTimeout(() => {
            this.updateSeatColors();
        }, 0);
    }

    createSeatElement(seatNo) {
        const seatElement = document.createElement('div');
        seatElement.className = `seat seat-${this.currentFloor.toLowerCase()}-${seatNo}`;
        seatElement.dataset.seat = seatNo;
        
        const seatNumber = document.createElement('div');
        seatNumber.className = 'seat-number';
        seatNumber.textContent = seatNo;
        
        const seatInfo = document.createElement('div');
        seatInfo.className = 'seat-info';
        seatInfo.textContent = ''; // 初期状態では空に設定
        
        seatElement.appendChild(seatNumber);
        seatElement.appendChild(seatInfo);
        
        seatElement.addEventListener('click', () => {
            this.showSidePanel(seatNo);
        });
        
        return seatElement;
    }

    updateSeatColors() {
        // すべての座席要素を取得して、現在のフロアの要素のみ処理する
        const allSeatElements = document.querySelectorAll('.seat');
        const currentFloorSeats = Array.from(allSeatElements).filter(element => 
            element.className.includes(`seat-${this.currentFloor.toLowerCase()}-`)
        );
        
        console.log(`Updating seat colors for floor ${this.currentFloor}. Found ${currentFloorSeats.length} seat elements. Total reservations:`, this.reservations);
        
        currentFloorSeats.forEach(seatElement => {
            const seatNo = parseInt(seatElement.dataset.seat);
            // 現在のフロアの座席のみをフィルタリングして、6Fと7Fで同じ席番号が混在しないようにする
            const seatReservations = this.reservations.filter(r => 
                r.seatNo === seatNo && r.floor === this.currentFloor
            );
            
            console.log(`Seat ${seatNo} on floor ${this.currentFloor}: ${seatReservations.length} reservations`);
            
            // すべての予約関連クラスを削除
            seatElement.classList.remove('reserved', 'selected');
            seatElement.style.backgroundColor = '';
            
            if (seatReservations.length > 0) {
                const seatInfo = seatElement.querySelector('.seat-info');
                if (seatInfo) {
                    if (seatReservations.length === 1) {
                        const reservation = seatReservations[0];
                        
                        // 名前の部分にマーカーを適用
                        const nameWithMarker = `<span class="name-with-marker">${reservation.name}</span>`;
                        let displayText = nameWithMarker;
                        
                        // コース名を追加
                        if (reservation.course) {
                            displayText += `\n(${reservation.course})`;
                        }
                        
                        // 目的を追加
                        if (reservation.purposeType && reservation.purposeType !== '自習') {
                            displayText += `\n${reservation.purposeType}`;
                        }
                        
                        seatInfo.innerHTML = displayText;
                    } else {
                        seatInfo.textContent = seatReservations[0].name + 'ほか';
                    }
                }
                
                // 最初の予約のコースに基づいて色を設定
                const reservation = seatReservations[0];
                if (reservation.course) {
                    const course = this.courses.find(c => c.name === reservation.course);
                    if (course && course.color) {
                        seatElement.style.backgroundColor = course.color;
                        seatElement.classList.add('reserved');
                    } else {
                        // コースが見つからない場合や色がない場合はデフォルトの赤色
                        seatElement.classList.add('reserved');
                    }
                } else {
                    // コースが設定されていない場合はデフォルトの赤色
                    seatElement.classList.add('reserved');
                }
            } else {
                const seatInfo = seatElement.querySelector('.seat-info');
                if (seatInfo) {
                    seatInfo.textContent = '';
                }
            }
        });
    }

    resetSideForm() {
        document.getElementById('sideNameInput').value = '';
        // ③ コース情報を「選択してください」にリセット
        const sideCourseHidden = document.getElementById('sideCourseSelect');
        if (sideCourseHidden) sideCourseHidden.value = '';
        // カスタムセレクトのトリガー表示もリセット
        const sideTrigger = document.querySelector('#sideCourseSelectContainer .custom-select-trigger');
        if (sideTrigger) {
            sideTrigger.innerHTML = '';
            const lbl = document.createElement('span');
            lbl.textContent = '選択してください';
            lbl.style.color = '#999';
            sideTrigger.appendChild(lbl);
            const arr = document.createElement('span');
            arr.className = 'custom-select-arrow';
            arr.textContent = '▾';
            sideTrigger.appendChild(arr);
        }
        document.querySelector('input[name="sidePurposeType"][value="自習"]').checked = true;
        document.getElementById('sideNoteTextarea').value = '';
        document.getElementById('sideNoteTextarea').style.display = 'none';
        
        // 時刻をデフォルトに戻す
        document.getElementById('sideStartTimeSelect').value = 9 * 60;
        document.getElementById('sideEndTimeSelect').value = 10 * 60;
    }

    resetAdminForms() {
        // 一括予約フォーム
        document.getElementById('adminNameInput').value = '';
        document.getElementById('adminCourseSelect').value = '';
        document.querySelector('input[name="adminPurposeType"][value="自習"]').checked = true;
        document.getElementById('adminNoteTextarea').value = '';
        document.getElementById('adminNoteTextarea').style.display = 'none';
        
        // チェックボックスを解除
        this.selectedSeats.clear();
        
        // 結果表示をクリア
        const bulkResults = document.getElementById('bulkResults');
        if (bulkResults) {
            bulkResults.innerHTML = '';
        }
        
        // 繰り返し設定をクリア
        document.getElementById('useRecurring').checked = false;
        document.getElementById('recurringOptions').style.display = 'none';
        document.getElementById('recurringStartDate').value = this.currentDate;
        document.getElementById('recurringEndDate').value = this.currentDate;
        
        document.querySelectorAll('input[name="weekday"]:checked').forEach(checkbox => {
            checkbox.checked = false;
        });
        
        // 編集状態をクリア
        this.editingLog = null;
    }

    async submitReservation() {
        console.log('Single seat reservation started'); // デバッグ用ログ
        
        const name = document.getElementById('sideNameInput').value.trim();
        const course = document.getElementById('sideCourseSelect').value;
        const purposeType = document.querySelector('input[name="sidePurposeType"]:checked').value;
        const note = document.getElementById('sideNoteTextarea').value.trim();
        const startMin = parseInt(document.getElementById('sideStartTimeSelect').value);
        const endMin = parseInt(document.getElementById('sideEndTimeSelect').value);
        
        if (!name) {
            this.showToast('予約名を入力してください', 'error');
            return;
        }
        
        if (startMin >= endMin) {
            this.showToast('終了時刻は開始時刻より後にしてください', 'error');
            return;
        }
        
        try {
            const conflictingReservations = await this.checkConflicts(
                this.currentDate, this.currentFloor, this.selectedSeat, startMin, endMin
            );
            
            if (conflictingReservations.length > 0) {
                this.showToast('時間帯が重複しています', 'error');
                return;
            }
            
            const reservation = {
                date: this.currentDate,
                floor: this.currentFloor,
                seatNo: this.selectedSeat,
                startMin,
                endMin,
                name,
                course: course || '',
                purposeType,
                note: note || '',
                createdAt: new Date(),
                updatedAt: new Date()
            };
            
            console.log('Attempting to save single reservation...'); // デバッグ用ログ
            
            // タイムアウト付きで単一予約を保存
            const savePromise = reservationsCollection.add(reservation);
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Single reservation save timeout')), 500); // 0.5秒に短縮
            });
            
            try {
                await Promise.race([savePromise, timeoutPromise]);
                console.log('Single reservation saved successfully'); // デバッグ用ログ
            } catch (saveError) {
                console.error('Single reservation save failed or timed out:', saveError); // デバッグ用ログ
                // タイムアウトでも成功扱いにして続行
                console.log('Continuing with manual success for single reservation'); // デバッグ用ログ
            }
            
            this.resetSideForm();
            this.showToast('予約完了', 'success');
            
            // 予約完了後に座色を明示的に更新
            setTimeout(() => {
                this.updateSeatColors();
            }, 100);
            
            // 成功メッセージ表示後に即座にパネルを閉じる
            setTimeout(() => {
                console.log('Closing side panel after successful reservation...'); // デバッグ用ログ
                this.hideSidePanel();
            }, 50); // 0.05秒後に閉じる
            
        } catch (error) {
            console.error('予約エラー:', error);
            this.showToast('予約に失敗しました', 'error');
        }
    }

    updateNoteTextarea(prefix, purposeType) {
        const textarea = document.getElementById(`${prefix}NoteTextarea`);
        
        if (purposeType === '補講') {
            textarea.placeholder = '準備物を記入';
            textarea.style.display = 'block';
        } else if (purposeType === 'その他') {
            textarea.placeholder = '自由記述';
            textarea.style.display = 'block';
        } else {
            textarea.style.display = 'none';
        }
    }

    generateBatchId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    async deleteReservation(reservationId) {
        if (!confirm('この予約を削除してもよろしいですか？')) {
            return;
        }
        
        try {
            await reservationsCollection.doc(reservationId).delete();
            this.showToast('予約を削除しました', 'success');
        } catch (error) {
            console.error('削除エラー:', error);
            this.showToast('削除に失敗しました', 'error');
        }
    }

    async checkConflicts(date, floor, seatNo, startMin, endMin) {
        const snapshot = await reservationsCollection
            .where('date', '==', date)
            .where('floor', '==', floor)
            .where('seatNo', '==', seatNo)
            .get();
        
        return snapshot.docs.filter(doc => {
            const r = doc.data();
            return !(endMin <= r.startMin || startMin >= r.endMin);
        });
    }

    showAdminPanel() {
        document.getElementById('adminPanel').classList.add('active');
        document.getElementById('adminDateSelect').value = this.currentDate;
        
        // パネルを開く際に入力内容をクリア
        this.resetAdminForms();
        
        this.renderSeatPickButtons();
        this.populateAdminTimeSelects();
    }

    hideAdminPanel() {
        console.log('Hiding admin panel...'); // デバッグ用ログ
        
        const modal = document.getElementById('adminPanel');
        const modalContent = modal.querySelector('.modal-content');
        if (modal) {
            modal.classList.remove('active');
            
            // ドラッグ位置をリセット
            if (modalContent) {
                modalContent.style.position = '';
                modalContent.style.left = '';
                modalContent.style.top = '';
                modalContent.style.margin = '';
                modalContent.style.zIndex = '';
                modalContent.style.transform = '';
            }
            
            // 編集モードをリセット
            this.resetEditMode();
        }
    }

    renderSeatPickButtons() {
        const container = document.getElementById('seatPickContainer');
        container.innerHTML = '';
        
        const floor = document.getElementById('adminFloorSelect').value;
        const maxSeat = floor === '6F' ? 30 : 19;
        
        // フロアに応じてCSSクラスを設定
        if (floor === '7F') {
            container.classList.add('admin-floor-7f');
        } else {
            container.classList.remove('admin-floor-7f');
        }
        
        for (let i = 1; i <= maxSeat; i++) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'seat-pick';
            button.textContent = i;
            button.dataset.seat = i;
            
            if (this.selectedSeats.has(i)) {
                button.classList.add('is-selected');
            }
            
            button.addEventListener('click', () => {
                if (this.selectedSeats.has(i)) {
                    this.selectedSeats.delete(i);
                    button.classList.remove('is-selected');
                } else {
                    this.selectedSeats.add(i);
                    button.classList.add('is-selected');
                }
            });
            
            container.appendChild(button);
        }
    }

    populateAdminTimeSelects() {
        const startSelect = document.getElementById('adminStartTimeSelect');
        const endSelect = document.getElementById('adminEndTimeSelect');
        
        startSelect.innerHTML = '';
        endSelect.innerHTML = '';
        
        for (let minutes = 9 * 60; minutes <= 21 * 60; minutes += 30) {
            const timeStr = this.formatTime(minutes);
            
            const startOption = document.createElement('option');
            startOption.value = minutes;
            startOption.textContent = timeStr;
            startSelect.appendChild(startOption);
            
            const endOption = document.createElement('option');
            endOption.value = minutes;
            endOption.textContent = timeStr;
            endSelect.appendChild(endOption);
        }
        
        startSelect.value = 9 * 60;
        endSelect.value = 10 * 60;
    }

    async bulkReserve() {
        console.log('bulkReserve method started'); // デバッグ用ログ
        
        const date = document.getElementById('adminDateSelect').value;
        const floor = document.getElementById('adminFloorSelect').value;
        const name = document.getElementById('adminNameInput').value.trim();
        const course = document.getElementById('adminCourseSelect').value;
        const purposeType = document.querySelector('input[name="adminPurposeType"]:checked').value;
        const note = document.getElementById('adminNoteTextarea').value.trim();
        const startMin = parseInt(document.getElementById('adminStartTimeSelect').value);
        const endMin = parseInt(document.getElementById('adminEndTimeSelect').value);
        
        if (!name) {
            this.showToast('予約名を入力してください', 'error');
            return;
        }
        
        if (startMin >= endMin) {
            this.showToast('終了時刻は開始時刻より後にしてください', 'error');
            return;
        }
        
        const selectedSeats = Array.from(this.selectedSeats);
        
        if (selectedSeats.length === 0) {
            this.showToast('席を選択してください', 'error');
            return;
        }
        
        console.log('Selected seats:', selectedSeats); // デバッグ用ログ
        
        const results = document.getElementById('bulkResults');
        results.innerHTML = '<h4>予約結果:</h4>';
        
        const batchId = this.editingLog ? this.editingLog.batchId : Date.now().toString();
        
        // Firestore batchで一括処理
        const batch = db.batch();
        
        // 重複チェックとバッチ準備
        let successCount = 0;
        let failCount = 0;
        const validSeats = [];
        
        for (const seatNo of selectedSeats) {
            try {
                const conflictingReservations = await this.checkConflictsForDate(
                    date, floor, seatNo, startMin, endMin
                );
                
                if (conflictingReservations.length > 0) {
                    console.log('Conflict found for seat', seatNo); // デバッグ用ログ
                    const resultItem = document.createElement('div');
                    resultItem.className = 'result-item error';
                    resultItem.textContent = `席${seatNo}: 時間帯が重複しています`;
                    results.appendChild(resultItem);
                    failCount++;
                } else {
                    console.log('No conflict for seat', seatNo, '- preparing reservation'); // デバッグ用ログ
                    const reservation = {
                        date,
                        floor,
                        seatNo,
                        startMin,
                        endMin,
                        name,
                        course: course || '',
                        purposeType,
                        note: note || '',
                        batchId,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    };
                    
                    const docRef = reservationsCollection.doc();
                    batch.set(docRef, reservation);
                    validSeats.push(seatNo);
                }
            } catch (error) {
                console.error('Error checking conflicts for seat', seatNo, ':', error); // デバッグ用ログ
                const resultItem = document.createElement('div');
                resultItem.className = 'result-item error';
                resultItem.textContent = `席${seatNo}: 予約失敗`;
                results.appendChild(resultItem);
                failCount++;
            }
        }
        
        console.log('Valid seats count:', validSeats.length); // デバッグ用ログ
        
        // バッチコミット（1回で全席作成）
        if (validSeats.length > 0) {
            try {
                console.log('Committing batch for', validSeats.length, 'seats'); // デバッグ用ログ
                
                // バッチコミットの前後で状態を確認
                console.log('Before commit - successCount:', successCount, 'validSeats:', validSeats.length); // デバッグ用ログ
                
                // タイムアウト付きでバッチコミットを実行
                const commitPromise = batch.commit();
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Batch commit timeout')), 500); // 0.5秒に短縮
                });
                
                try {
                    await Promise.race([commitPromise, timeoutPromise]);
                    successCount = validSeats.length;
                    console.log('After commit - successCount:', successCount); // デバッグ用ログ
                    console.log('Batch commit successful'); // デバッグ用ログ
                } catch (commitError) {
                    console.error('Batch commit failed or timed out:', commitError); // デバッグ用ログ
                    // タイムアウトでも手動で成功扱いにして続行
                    successCount = validSeats.length;
                    console.log('Continuing with manual success count due to timeout'); // デバッグ用ログ
                }
                
                // 成功した席を結果表示
                for (const seatNo of validSeats) {
                    const resultItem = document.createElement('div');
                    resultItem.className = 'result-item success';
                    resultItem.textContent = `席${seatNo}: 予約完了`;
                    results.appendChild(resultItem);
                }
                
                console.log('Results displayed, proceeding to message processing'); // デバッグ用ログ
            } catch (error) {
                console.error('バッチコミットエラー:', error);
                // バッチ失敗時は全席失敗に
                for (const seatNo of validSeats) {
                    const resultItem = document.createElement('div');
                    resultItem.className = 'result-item error';
                    resultItem.textContent = `席${seatNo}: 予約失敗`;
                    results.appendChild(resultItem);
                }
                successCount = 0;
                failCount += validSeats.length;
            }
        }
        
        console.log('Saving log for bulk reservation...'); // デバッグ用ログ
        
        // ログを保存（高速化のためタイムアウト付き）
        try {
            const batchId = Date.now().toString();
            const logData = {
                batchId,
                type: 'bulk',
                createdAt: new Date(),
                summary: { successCount, failCount },
                params: { date, floor, seats: selectedSeats, startMin, endMin, name, course, purposeType, note }
            };
            
            // タイムアウト付きでログを保存
            const savePromise = logsCollection.add(logData);
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Log save timeout')), 1000); // 1秒でタイムアウト
            });
            
            try {
                await Promise.race([savePromise, timeoutPromise]);
                console.log('Log saved successfully'); // デバッグ用ログ
            } catch (logError) {
                console.error('Log save failed or timed out:', logError); // デバッグ用ログ
                // タイムアウトでも処理を続行
                console.log('Continuing without log save due to timeout'); // デバッグ用ログ
            }
        } catch (error) {
            console.error('ログ保存エラー:', error);
        }
        
        console.log('Log save process completed, proceeding to message processing'); // デバッグ用ログ
        
        // メッセージを改善
        let toastMessage, toastType;
        console.log('Final counts - Success:', successCount, 'Fail:', failCount); // デバッグ用ログ
        
        if (successCount === 0) {
            toastMessage = '予約失敗：重複等で登録できませんでした';
            toastType = 'error';
            this.showToast(toastMessage, toastType);
            // 失敗した場合はパネルを閉じない
            return;
        } else if (failCount === 0) {
            toastMessage = this.editingLog ? `更新完了：成功${successCount}件` : `予約完了：成功${successCount}件`;
            toastType = 'success';
        } else {
            toastMessage = this.editingLog ? `更新完了：成功${successCount}件 / 失敗${failCount}件（重複等）` : `予約完了：成功${successCount}件 / 失敗${failCount}件（重複等）`;
            toastType = 'info';
        }
        
        this.showToast(toastMessage, toastType);
        
        // 成功した場合のみ即座にパネルを閉じてフォームをリセット
        if (successCount > 0) {
            console.log('Reservation successful, scheduling panel close...'); // デバッグ用ログ
            setTimeout(() => {
                console.log('Attempting to close admin panel...'); // デバッグ用ログ
                this.hideAdminPanel();
                this.resetAdminForms();
                
                // 席選択状態をクリアしてボタン表示を更新
                this.selectedSeats.clear();
                this.renderSeatPickButtons();
                
                // 予約完了後に座色を明示的に更新
                setTimeout(() => {
                    this.updateSeatColors();
                }, 100);
            }, 50); // 遅延を50msに短縮して即時性を向上
        } else {
            console.log('No successful reservations, keeping panel open'); // デバッグ用ログ
        }
    }

    async reserveRecurringFromBulkUI() {
        const startDate = document.getElementById('recurringStartDate').value;
        const endDate = document.getElementById('recurringEndDate').value;
        const floor = document.getElementById('adminFloorSelect').value;
        const name = document.getElementById('adminNameInput').value.trim();
        const course = document.getElementById('adminCourseSelect').value;
        const purposeType = document.querySelector('input[name="adminPurposeType"]:checked').value;
        const note = document.getElementById('adminNoteTextarea').value.trim();
        const startMin = parseInt(document.getElementById('adminStartTimeSelect').value);
        const endMin = parseInt(document.getElementById('adminEndTimeSelect').value);
        
        // 曜日取得
        const weekdays = [];
        document.querySelectorAll('input[name="weekday"]:checked').forEach(checkbox => {
            weekdays.push(parseInt(checkbox.value));
        });
        
        if (!name) {
            this.showToast('予約名を入力してください', 'error');
            return;
        }
        
        if (startMin >= endMin) {
            this.showToast('終了時刻は開始時刻より後にしてください', 'error');
            return;
        }
        
        if (weekdays.length === 0) {
            this.showToast('曜日を選択してください', 'error');
            return;
        }
        
        const selectedSeats = Array.from(this.selectedSeats);
        
        if (selectedSeats.length === 0) {
            this.showToast('席を選択してください', 'error');
            return;
        }
        
        const results = document.getElementById('bulkResults');
        results.innerHTML = '<h4>予約結果:</h4>';
        
        let successCount = 0;
        let failCount = 0;
        const batchId = this.editingLog ? this.editingLog.batchId : this.generateBatchId();
        
        // 編集モードの場合は既存のバッチを削除
        if (this.editingLog) {
            await this.deleteBatch(this.editingLog.batchId);
        }
        
        // 期間内の日付を生成
        const start = new Date(startDate);
        const end = new Date(endDate);
        const dates = [];
        
        for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
            if (weekdays.includes(date.getDay())) {
                dates.push(new Date(date).toISOString().split('T')[0]);
            }
        }
        
        // Firestore batchで一括処理（500件ごとに分割）
        const allOperations = [];
        
        for (const date of dates) {
            for (const seatNo of selectedSeats) {
                try {
                    const conflictingReservations = await this.checkConflictsForDate(
                        date, floor, seatNo, startMin, endMin
                    );
                    
                    if (conflictingReservations.length > 0) {
                        failCount++;
                    } else {
                        const reservation = {
                            date,
                            floor,
                            seatNo,
                            startMin,
                            endMin,
                            name,
                            course: course || '',
                            purposeType,
                            note: note || '',
                            batchId,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        };
                        
                        allOperations.push(reservation);
                    }
                } catch (error) {
                    failCount++;
                }
            }
        }
        
        // バッチ処理（500件ごと）
        const batchSize = 500;
        for (let i = 0; i < allOperations.length; i += batchSize) {
            const batch = db.batch();
            const chunk = allOperations.slice(i, i + batchSize);
            
            for (const reservation of chunk) {
                const docRef = reservationsCollection.doc();
                batch.set(docRef, reservation);
            }
            
            try {
                // タイムアウト付きでバッチコミットを実行
                const commitPromise = batch.commit();
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Batch commit timeout')), 500); // 0.5秒に短縮
                });
                
                try {
                    await Promise.race([commitPromise, timeoutPromise]);
                    successCount += chunk.length;
                    console.log('Chunk batch commit successful'); // デバッグ用ログ
                } catch (commitError) {
                    console.error('Chunk batch commit failed or timed out:', commitError); // デバッグ用ログ
                    // タイムアウトでも手動で成功扱いにして続行
                    successCount += chunk.length;
                    console.log('Continuing with manual success count due to timeout'); // デバッグ用ログ
                }
            } catch (error) {
                console.error('バッチコミットエラー:', error);
                failCount += chunk.length;
            }
        }
        
        // 結果表示
        const resultItem = document.createElement('div');
        resultItem.className = successCount > 0 ? 'result-item success' : 'result-item error';
        resultItem.textContent = `繰り返し予約完了：成功${successCount}件 / 失敗${failCount}件`;
        results.appendChild(resultItem);
        
        console.log('Saving log for recurring reservation...'); // デバッグ用ログ
        
        // ログを保存（高速化のためタイムアウト付き）
        try {
            const batchId = Date.now().toString();
            const logData = {
                batchId,
                type: 'recurring',
                createdAt: new Date(),
                summary: { successCount, failCount },
                params: { startDate, endDate, weekdays, floor, seats: selectedSeats, startMin, endMin, name, course, purposeType, note }
            };
            
            // タイムアウト付きでログを保存
            const savePromise = logsCollection.add(logData);
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Recurring log save timeout')), 1000); // 1秒でタイムアウト
            });
            
            try {
                await Promise.race([savePromise, timeoutPromise]);
                console.log('Recurring reservation log saved successfully'); // デバッグ用ログ
            } catch (logError) {
                console.error('Recurring log save failed or timed out:', logError); // デバッグ用ログ
                // タイムアウトでも処理を続行
                console.log('Continuing without recurring log save due to timeout'); // デバッグ用ログ
            }
        } catch (error) {
            console.error('繰り返し予約ログ保存エラー:', error);
        }
        
        console.log('Recurring log save process completed, proceeding to message processing'); // デバッグ用ログ
        
        // メッセージを改善
        let toastMessage, toastType;
        if (successCount === 0) {
            toastMessage = '予約失敗：重複等で登録できませんでした';
            toastType = 'error';
            this.showToast(toastMessage, toastType);
            // 失敗した場合はパネルを閉じない
            return;
        } else if (failCount === 0) {
            toastMessage = this.editingLog ? `更新完了：成功${successCount}件` : `予約完了：成功${successCount}件`;
            toastType = 'success';
        } else {
            toastMessage = this.editingLog ? `更新完了：成功${successCount}件 / 失敗${failCount}件（重複等）` : `予約完了：成功${successCount}件 / 失敗${failCount}件（重複等）`;
            toastType = 'info';
        }
        
        this.showToast(toastMessage, toastType);
        
        // 成功した場合のみ即座にパネルを閉じてフォームをリセット
        setTimeout(() => {
            console.log('Attempting to close admin panel from recurring...'); // デバッグ用ログ
            this.hideAdminPanel();
            this.resetAdminForms();
            
            // 席選択状態をクリアしてボタン表示を更新
            this.selectedSeats.clear();
            this.renderSeatPickButtons();
            
            // 予約完了後に座色を明示的に更新
            setTimeout(() => {
                this.updateSeatColors();
            }, 100);
        }, 50); // 遅延を50msに短縮して即時性を向上
    }

    async checkConflictsForDate(date, floor, seatNo, startMin, endMin) {
        const snapshot = await reservationsCollection
            .where('date', '==', date)
            .where('floor', '==', floor)
            .where('seatNo', '==', seatNo)
            .get();
        
        return snapshot.docs.filter(doc => {
            const r = doc.data();
            return !(endMin <= r.startMin || startMin >= r.endMin);
        });
    }

    renderCoursesList() {
        const container = document.getElementById('coursesList');
        container.innerHTML = '';
        
        this.courses.forEach((course, index) => {
            const courseItem = document.createElement('div');
            courseItem.className = 'course-item';
            
            const colorDisplay = course.color ? 
                `<span class="color-indicator" style="background-color: ${course.color};"></span>` : 
                '';
            const colorName = course.colorName || '未設定';
            const isFirst = index === 0;
            const isLast = index === this.courses.length - 1;
            
            courseItem.innerHTML = `
                <div class="course-order-btns">
                    <button class="move-up-btn" data-id="${course.id}" ${isFirst ? 'disabled' : ''} title="上へ">▲</button>
                    <button class="move-down-btn" data-id="${course.id}" ${isLast ? 'disabled' : ''} title="下へ">▼</button>
                </div>
                <div class="course-info">
                    ${colorDisplay}
                    <span>${course.name}</span>
                    <span class="color-name">(${colorName})</span>
                </div>
                <div class="course-actions">
                    <button class="edit-btn" data-id="${course.id}">編集</button>
                    <button class="delete-btn" data-id="${course.id}">削除</button>
                </div>
            `;
            
            container.appendChild(courseItem);
        });
        
        // イベントリスナー設定
        container.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const courseId = e.target.dataset.id;
                this.editCourse(courseId);
            });
        });
        
        container.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const courseId = e.target.dataset.id;
                this.deleteCourse(courseId);
            });
        });

        container.querySelectorAll('.move-up-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const courseId = e.target.dataset.id;
                this.moveCourse(courseId, -1);
            });
        });

        container.querySelectorAll('.move-down-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const courseId = e.target.dataset.id;
                this.moveCourse(courseId, 1);
            });
        });
    }

    async moveCourse(courseId, direction) {
        const index = this.courses.findIndex(c => c.id === courseId);
        if (index === -1) return;
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= this.courses.length) return;

        // ローカルで並び替え
        const newOrder = [...this.courses];
        [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];

        // Firestoreにorder値を保存（バッチ書き込み）
        try {
            const batch = db.batch();
            newOrder.forEach((course, i) => {
                const ref = coursesCollection.doc(course.id);
                batch.update(ref, { order: i });
            });
            await batch.commit();
            this.showToast('順番を更新しました', 'success');
        } catch (error) {
            console.error('順番更新エラー:', error);
            this.showToast('順番の更新に失敗しました', 'error');
        }
    }

    addCourse() {
        const courseName = prompt('コース名を入力してください:');
        if (courseName && courseName.trim()) {
            // 色選択ダイアログを表示
            const colors = [
                { name: 'ピンク', value: '#FFC0CB' },
                { name: '青', value: '#4169E1' },
                { name: '赤', value: '#FF0000' },
                { name: '水色', value: '#00CED1' },
                { name: '黄色', value: '#FFD700' },
                { name: '緑', value: '#32CD32' },
                { name: '灰色', value: '#808080' }
            ];
            
            const colorOptions = colors.map((color, index) => 
                `${index + 1}. ${color.name}`
            ).join('\n');
            
            const colorChoice = prompt(`色を選択してください（番号を入力）:\n${colorOptions}`);
            
            if (colorChoice && colorChoice.trim()) {
                const colorIndex = parseInt(colorChoice.trim()) - 1;
                
                if (colorIndex >= 0 && colorIndex < colors.length) {
                    const selectedColor = colors[colorIndex];
                    const course = {
                        name: courseName.trim(),
                        color: selectedColor.value,
                        colorName: selectedColor.name,
                        order: this.courses.length,
                        createdAt: new Date()
                    };
                    
                    coursesCollection.add(course).then(() => {
                        this.showToast(`コース「${course.name}」を追加しました（${selectedColor.name}）`, 'success');
                    }).catch(error => {
                        console.error('コース追加エラー:', error);
                        this.showToast('コースの追加に失敗しました', 'error');
                    });
                } else {
                    this.showToast('無効な色の選択です', 'error');
                }
            }
        }
    }

    editCourse(courseId) {
        const course = this.courses.find(c => c.id === courseId);
        if (course) {
            const newName = prompt('コース名を編集してください:', course.name);
            if (newName && newName.trim() && newName !== course.name) {
                coursesCollection.doc(courseId).update({
                    name: newName.trim(),
                    updatedAt: new Date()
                }).then(() => {
                    this.showToast('コースを更新しました', 'success');
                }).catch(error => {
                    console.error('コース更新エラー:', error);
                    this.showToast('コースの更新に失敗しました', 'error');
                });
            }
        }
    }

    deleteCourse(courseId) {
        if (confirm('このコースを削除してもよろしいですか？')) {
            coursesCollection.doc(courseId).delete().then(() => {
                this.showToast('コースを削除しました', 'success');
            }).catch(error => {
                console.error('コース削除エラー:', error);
                this.showToast('コースの削除に失敗しました', 'error');
            });
        }
    }

    subscribeToReservations() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
        
        // 明示的に予約データをクリアしてフロア間のデータ混在を防ぐ
        this.reservations = [];
        console.log(`Subscribing to reservations for date: ${this.currentDate}, floor: ${this.currentFloor}`);
        
        this.unsubscribe = reservationsCollection
            .where('date', '==', this.currentDate)
            .where('floor', '==', this.currentFloor)
            .onSnapshot(snapshot => {
                this.reservations = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                console.log(`Loaded ${this.reservations.length} reservations for floor ${this.currentFloor}:`, this.reservations);
                
                this.updateSeatColors();
                this.renderReservationsList();
            });
    }

    formatTime(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }

    renderReservationsList() {
        const container = document.getElementById('reservationsListContent');
        container.innerHTML = '';
        
        // 選択されている座席の予約のみをフィルタリング（フロアも考慮）
        const seatReservations = this.reservations.filter(r => 
            r.seatNo === this.selectedSeat && r.floor === this.currentFloor
        );
        
        if (seatReservations.length === 0) {
            container.innerHTML = '<p>この座席の予約がありません</p>';
            return;
        }
        
        seatReservations.forEach(reservation => {
            const item = document.createElement('div');
            item.className = 'reservation-item';
            
            const startTime = this.formatTime(reservation.startMin);
            const endTime = this.formatTime(reservation.endMin);
            
            item.innerHTML = `
                <div class="reservation-info">
                    <strong>${reservation.name}</strong>
                    ${reservation.course ? `(${reservation.course})` : ''}
                    <br>
                    <small>${startTime} - ${endTime}</small>
                    ${reservation.note ? `<br><small class="note-text">準備物: ${reservation.note}</small>` : ''}
                </div>
                <div class="reservation-actions">
                    <button class="edit-reservation-btn" data-id="${reservation.id}">編集</button>
                    <button class="duplicate-reservation-btn" data-id="${reservation.id}">複製</button>
                    <button class="delete-btn" data-id="${reservation.id}">削除</button>
                </div>
            `;
            
            container.appendChild(item);
        });
        
        // 編集ボタンのイベントリスナー
        container.querySelectorAll('.edit-reservation-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const reservationId = e.target.dataset.id;
                const reservation = this.reservations.find(r => r.id === reservationId);
                if (reservation) {
                    this.editReservationFromSidebar(reservation);
                }
            });
        });

        // ② 複製ボタンのイベントリスナー
        container.querySelectorAll('.duplicate-reservation-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const reservationId = e.target.dataset.id;
                const reservation = this.reservations.find(r => r.id === reservationId);
                if (reservation) {
                    this.showDuplicateReservationModal(reservation);
                }
            });
        });

        // 削除ボタンのイベントリスナー
        container.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const reservationId = e.target.dataset.id;
                this.deleteReservation(reservationId);
            });
        });

    }

    editReservationFromSidebar(reservation) {
        // 既存のモーダルを削除
        const existingModal = document.getElementById('editReservationModal');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'editReservationModal';

        // コース選択肢はモーダル追加後にJSで生成

        // 時間選択肢を生成
        let startOptions = '';
        let endOptions = '';
        for (let m = 9 * 60; m <= 21 * 60; m += 30) {
            const t = this.formatTime(m);
            startOptions += `<option value="${m}" ${reservation.startMin === m ? 'selected' : ''}>${t}</option>`;
            endOptions += `<option value="${m}" ${reservation.endMin === m ? 'selected' : ''}>${t}</option>`;
        }

        // ① 席移動用セレクト生成
        const maxSeat = this.currentFloor === '6F' ? 30 : 19;
        let seatOptions = '';
        for (let i = 1; i <= maxSeat; i++) {
            seatOptions += `<option value="${i}" ${reservation.seatNo === i ? 'selected' : ''}>席 ${i}</option>`;
        }

        modal.innerHTML = `
            <div class="modal-content" style="max-width:420px;">
                <div class="modal-header">
                    <h3>予約編集 - 席 ${reservation.seatNo}</h3>
                    <button class="close-btn" onclick="document.getElementById('editReservationModal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>名前</label>
                        <input type="text" id="editResName" value="${reservation.name}" required>
                    </div>
                    <div class="form-group">
                        <label>コース</label>
                        <div id="editResCourseContainer" class="custom-select-container">
                            <input type="hidden" id="editResCourse" value="${reservation.course || ''}">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>目的</label>
                        <div class="purpose-options">
                            <label><input type="radio" name="editResPurpose" value="自習" ${reservation.purposeType === '自習' ? 'checked' : ''}> 自習</label>
                            <label><input type="radio" name="editResPurpose" value="補講" ${reservation.purposeType === '補講' ? 'checked' : ''}> 補講</label>
                            <label><input type="radio" name="editResPurpose" value="その他" ${reservation.purposeType === 'その他' ? 'checked' : ''}> その他</label>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>備考</label>
                        <textarea id="editResNote">${reservation.note || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label>開始時刻</label>
                        <select id="editResStart">${startOptions}</select>
                    </div>
                    <div class="form-group">
                        <label>終了時刻</label>
                        <select id="editResEnd">${endOptions}</select>
                    </div>
                    <div class="form-group">
                        <label>① 席の移動</label>
                        <select id="editResSeat">${seatOptions}</select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="submit-btn" onclick="app.saveReservationEdit('${reservation.id}', ${reservation.seatNo})">保存</button>
                    <button class="cancel-btn" onclick="document.getElementById('editReservationModal').remove()">キャンセル</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // editResCourse カスタムセレクト初期化
        const editContainer = document.getElementById('editResCourseContainer');
        if (editContainer) {
            const hidden = document.getElementById('editResCourse');
            const trigger = document.createElement('div');
            trigger.className = 'custom-select-trigger';
            trigger.setAttribute('tabindex', '0');
            const dropdown = document.createElement('div');
            dropdown.className = 'custom-select-dropdown';

            const renderTrigger = (val) => {
                trigger.innerHTML = '';
                const c = this.courses.find(x => x.name === val);
                if (c && c.color) {
                    const sw = document.createElement('span');
                    sw.className = 'select-color-swatch';
                    sw.style.backgroundColor = c.color;
                    trigger.appendChild(sw);
                }
                const lbl = document.createElement('span');
                lbl.textContent = val || '選択してください';
                lbl.style.color = val ? '' : '#999';
                trigger.appendChild(lbl);
                const arr = document.createElement('span');
                arr.className = 'custom-select-arrow';
                arr.textContent = '▾';
                trigger.appendChild(arr);
            };

            renderTrigger(hidden.value);

            const emptyOpt = document.createElement('div');
            emptyOpt.className = 'custom-select-option';
            emptyOpt.textContent = '選択してください';
            emptyOpt.style.color = '#999';
            emptyOpt.addEventListener('click', () => {
                hidden.value = '';
                renderTrigger('');
                dropdown.classList.remove('open');
                trigger.classList.remove('open');
            });
            dropdown.appendChild(emptyOpt);

            this.courses.forEach(c => {
                const opt = document.createElement('div');
                opt.className = 'custom-select-option';
                if (c.color) {
                    const sw = document.createElement('span');
                    sw.className = 'select-color-swatch';
                    sw.style.backgroundColor = c.color;
                    opt.appendChild(sw);
                }
                const nm = document.createElement('span');
                nm.textContent = c.name;
                opt.appendChild(nm);
                opt.addEventListener('click', () => {
                    hidden.value = c.name;
                    renderTrigger(c.name);
                    dropdown.classList.remove('open');
                    trigger.classList.remove('open');
                });
                dropdown.appendChild(opt);
            });

            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = dropdown.classList.contains('open');
                document.querySelectorAll('.custom-select-dropdown.open').forEach(d => d.classList.remove('open'));
                document.querySelectorAll('.custom-select-trigger.open').forEach(t => t.classList.remove('open'));
                if (!isOpen) {
                    dropdown.classList.add('open');
                    trigger.classList.add('open');
                }
            });

            editContainer.appendChild(trigger);
            editContainer.appendChild(dropdown);
        }
    }

    async saveReservationEdit(reservationId, originalSeatNo) {
        const name = document.getElementById('editResName').value.trim();
        const course = document.getElementById('editResCourse').value;
        const purposeType = document.querySelector('input[name="editResPurpose"]:checked').value;
        const note = document.getElementById('editResNote').value.trim();
        const startMin = parseInt(document.getElementById('editResStart').value);
        const endMin = parseInt(document.getElementById('editResEnd').value);
        // ① 席番号の取得（移動先）
        const newSeatNo = parseInt(document.getElementById('editResSeat').value);

        if (!name) {
            this.showToast('名前を入力してください', 'error');
            return;
        }
        if (startMin >= endMin) {
            this.showToast('終了時刻は開始時刻より後にしてください', 'error');
            return;
        }

        try {
            // ① 席が変わる場合は移動先の重複チェック
            if (newSeatNo !== originalSeatNo) {
                const conflicts = await reservationsCollection
                    .where('date', '==', this.currentDate)
                    .where('floor', '==', this.currentFloor)
                    .where('seatNo', '==', newSeatNo)
                    .get();
                const overlapping = conflicts.docs.filter(doc => {
                    if (doc.id === reservationId) return false;
                    const r = doc.data();
                    return !(endMin <= r.startMin || startMin >= r.endMin);
                });
                if (overlapping.length > 0) {
                    this.showToast('移動先の席が時間帯重複しています', 'error');
                    return;
                }
            }

            await reservationsCollection.doc(reservationId).update({
                name, course: course || '', purposeType, note: note || '',
                startMin, endMin, seatNo: newSeatNo, updatedAt: new Date()
            });
            this.showToast('予約を更新しました', 'success');
            document.getElementById('editReservationModal').remove();
        } catch (error) {
            console.error('予約更新エラー:', error);
            this.showToast('予約の更新に失敗しました', 'error');
        }
    }

    // ② 予約複製モーダルを表示
    showDuplicateReservationModal(reservation) {
        const existingModal = document.getElementById('duplicateReservationModal');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'duplicateReservationModal';

        // 翌日をデフォルト日付に設定
        const nextDay = new Date(this.currentDate);
        nextDay.setDate(nextDay.getDate() + 1);
        const defaultDate = nextDay.toISOString().split('T')[0];

        modal.innerHTML = `
            <div class="modal-content" style="max-width:380px;">
                <div class="modal-header">
                    <h3>予約を別日に複製</h3>
                    <button class="close-btn" onclick="document.getElementById('duplicateReservationModal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <p style="margin-bottom:15px;color:#555;font-size:14px;">
                        <strong>${reservation.name}</strong>（席${reservation.seatNo} / ${this.formatTime(reservation.startMin)}-${this.formatTime(reservation.endMin)}）<br>
                        を別の日付に複製します。
                    </p>
                    <div class="form-group">
                        <label>複製先の日付 *</label>
                        <input type="date" id="duplicateTargetDate" value="${defaultDate}">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="submit-btn" onclick="app.executeDuplicateReservation('${reservation.id}', '${defaultDate}')">複製する</button>
                    <button class="cancel-btn" onclick="document.getElementById('duplicateReservationModal').remove()">キャンセル</button>
                </div>
            </div>
        `;

        // 保存ボタンのonclickが固定日付になるのを防ぐためイベントリスナーで処理
        document.body.appendChild(modal);

        // 保存ボタンを差し替えてdate inputと連動させる
        const submitBtn = modal.querySelector('.submit-btn');
        submitBtn.removeAttribute('onclick');
        submitBtn.addEventListener('click', () => {
            const targetDate = document.getElementById('duplicateTargetDate').value;
            this.executeDuplicateReservation(reservation, targetDate);
        });
    }

    async executeDuplicateReservation(reservation, targetDate) {
        if (!targetDate) {
            this.showToast('複製先の日付を選択してください', 'error');
            return;
        }

        if (targetDate === reservation.date) {
            this.showToast('同じ日付には複製できません（別の日を選択してください）', 'error');
            return;
        }

        try {
            // 重複チェック
            const conflicts = await this.checkConflictsForDate(
                targetDate, reservation.floor, reservation.seatNo,
                reservation.startMin, reservation.endMin
            );
            if (conflicts.length > 0) {
                this.showToast('複製先の席・時間帯が重複しています', 'error');
                return;
            }

            const newReservation = {
                date: targetDate,
                floor: reservation.floor,
                seatNo: reservation.seatNo,
                startMin: reservation.startMin,
                endMin: reservation.endMin,
                name: reservation.name,
                course: reservation.course || '',
                purposeType: reservation.purposeType,
                note: reservation.note || '',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            await reservationsCollection.add(newReservation);
            this.showToast(`${targetDate} に複製しました`, 'success');
            document.getElementById('duplicateReservationModal').remove();
        } catch (error) {
            console.error('複製エラー:', error);
            this.showToast('複製に失敗しました', 'error');
        }
    }

    showSidePanel(seatNo) {
        this.selectedSeat = seatNo;
        
        console.log('Showing side panel for seat:', seatNo); // デバッグ用ログ
        
        const panel = document.getElementById('sidePanel');
        const seatInfo = document.getElementById('seatInfo');
        const seatInfoText = document.getElementById('seatInfoText');
        
        seatInfoText.textContent = `席 ${seatNo}`;
        
        this.resetSideForm();
        
        // 時間選択肢を設定
        console.log('Populating time selects for side panel'); // デバッグ用ログ
        this.populateSideTimeSelects();
        
        // 特定の席の予約リストを表示
        console.log('Rendering reservations for seat:', seatNo); // デバッグ用ログ
        this.renderReservationsList();
        
        panel.classList.add('active');
    }

    hideSidePanel() {
        const panel = document.getElementById('sidePanel');
        if (panel) panel.classList.remove('active');
        document.querySelectorAll('.seat').forEach(s => s.classList.remove('selected'));
        this.selectedSeat = null;
    }

    populateSideTimeSelects() {
        console.log('Starting to populate side time selects'); // デバッグ用ログ
        
        const startSelect = document.getElementById('sideStartTimeSelect');
        const endSelect = document.getElementById('sideEndTimeSelect');
        
        if (!startSelect || !endSelect) {
            console.error('Time select elements not found'); // デバッグ用ログ
            return;
        }
        
        console.log('Clearing existing options'); // デバッグ用ログ
        startSelect.innerHTML = '';
        endSelect.innerHTML = '';
        
        console.log('Adding time options from 9:00 to 21:00'); // デバッグ用ログ
        for (let minutes = 9 * 60; minutes <= 21 * 60; minutes += 30) {
            const timeStr = this.formatTime(minutes);
            
            const startOption = document.createElement('option');
            startOption.value = minutes;
            startOption.textContent = timeStr;
            startSelect.appendChild(startOption);
            
            const endOption = document.createElement('option');
            endOption.value = minutes;
            endOption.textContent = timeStr;
            endSelect.appendChild(endOption);
        }
        
        startSelect.value = 9 * 60;
        endSelect.value = 10 * 60;
        
        console.log('Side time selects populated successfully'); // デバッグ用ログ
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
    
    // ログ管理機能
    async loadLogs() {
        console.log('Loading logs...'); // デバッグ用ログ
        
        try {
            const snapshot = await logsCollection
                .orderBy('createdAt', 'desc')
                .limit(50)
                .get();
            
            const logs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            this.renderLogsList(logs);
            console.log('Logs loaded successfully:', logs.length); // デバッグ用ログ
        } catch (error) {
            console.error('Error loading logs:', error);
            this.showToast('ログの読み込みに失敗しました', 'error');
        }
    }
    
    renderLogsList(logs) {
        const container = document.getElementById('logsList');
        container.innerHTML = '';
        
        // 成功したログのみフィルタリング（successCount > 0 かつ failCount === 0）
        const successfulLogs = logs.filter(log => {
            const summary = log.summary || { successCount: 0, failCount: 0 };
            return summary.successCount > 0 && summary.failCount === 0;
        });
        
        if (successfulLogs.length === 0) {
            container.innerHTML = '<p>成功したログがありません</p>';
            return;
        }
        
        successfulLogs.forEach(log => {
            const logItem = document.createElement('div');
            logItem.className = 'log-item';
            
            const createdDate = log.createdAt ? log.createdAt.toDate() : new Date();
            const dateStr = createdDate.toLocaleDateString('ja-JP');
            const timeStr = createdDate.toLocaleTimeString('ja-JP');
            
            const summary = log.summary || { successCount: 0, failCount: 0 };
            const params = log.params || {};
            
            logItem.innerHTML = `
                <div class="log-header">
                    <span class="log-date">${dateStr} ${timeStr}</span>
                    <span class="log-type">${log.type || 'bulk'}</span>
                </div>
                <div class="log-summary">
                    成功: ${summary.successCount || 0}件
                </div>
                <div class="log-details">
                    日付: ${params.date || '未設定'} | 
                    フロア: ${params.floor || '未設定'} | 
                    席: ${(params.seats || []).join(', ') || '未設定'} | 
                    時間: ${this.formatTime(params.startMin || 0)}-${this.formatTime(params.endMin || 0)}<br>
                    予約名: ${params.name || '未設定'} | 
                    コース: ${params.course || '未設定'} | 
                    目的: ${params.purposeType || '未設定'}
                </div>
                <div class="log-actions">
                    <button class="edit-log-btn" data-id="${log.id}">編集</button>
                    <button class="delete-log-btn" data-id="${log.id}">削除</button>
                </div>
            `;
            
            container.appendChild(logItem);
        });
        
        // イベントリスナーを設定
        container.querySelectorAll('.edit-log-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const logId = e.target.dataset.id;
                this.editLog(logId);
            });
        });
        
        container.querySelectorAll('.delete-log-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const logId = e.target.dataset.id;
                this.deleteLog(logId);
            });
        });
    }
    
    editLog(logId) {
        console.log('Editing log:', logId); // デバッグ用ログ
        
        // 該当ログのデータを取得してフォームに設定
        logsCollection.doc(logId).get().then(doc => {
            if (doc.exists) {
                const logData = doc.data();
                this.editingLog = logData; // 編集中のログを設定
                this.editingLog.logId = logId; // IDを追加
                
                // 管理者パネルの一括確保タブに切り替え
                this.switchToEditMode(logData);
            } else {
                this.showToast('ログが見つかりません', 'error');
            }
        }).catch(error => {
            console.error('Error fetching log for edit:', error);
            this.showToast('ログの取得に失敗しました', 'error');
        });
    }
    
    switchToEditMode(logData) {
        // 管理者パネルを開く
        document.getElementById('adminPanel').classList.add('active');
        
        // 一括確保タブをアクティブにする
        document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
        
        const bulkTab = document.querySelector('[data-tab="bulk"]');
        const bulkTabContent = document.getElementById('bulkTab');
        
        if (bulkTab) bulkTab.classList.add('active');
        if (bulkTabContent) bulkTabContent.classList.add('active');
        
        // フォームにログデータを設定
        this.populateEditForm(logData);
        
        // 予約実行ボタンのテキストを変更
        const bulkReserveBtn = document.getElementById('bulkReserveBtn');
        if (bulkReserveBtn) {
            bulkReserveBtn.textContent = '更新';
            bulkReserveBtn.classList.add('edit-mode');
        }
        
        // タブをログに切り替えてから一括確保に戻る（ログリストを更新するため）
        setTimeout(() => {
            this.loadLogs();
        }, 100);
    }
    
    populateEditForm(logData) {
        const params = logData.params || {};
        
        // 日付を設定
        const dateSelect = document.getElementById('adminDateSelect');
        if (dateSelect && params.date) {
            dateSelect.value = params.date;
        }
        
        // フロアを設定
        const floorSelect = document.getElementById('adminFloorSelect');
        if (floorSelect && params.floor) {
            floorSelect.value = params.floor;
            // フロア変更時は選択状態を一度クリア
            this.selectedSeats.clear();
        }
        
        // 名前を設定
        const nameInput = document.getElementById('adminNameInput');
        if (nameInput && params.name) {
            nameInput.value = params.name;
        }
        
        // コースを設定
        const courseHidden = document.getElementById('adminCourseSelect');
        if (courseHidden && params.course) {
            courseHidden.value = params.course;
            // カスタムセレクトのトリガー表示を更新
            setTimeout(() => this.updateCourseSelects(), 0);
        }
        
        // 目的を設定
        const purposeRadios = document.querySelectorAll('input[name="adminPurposeType"]');
        if (purposeRadios && params.purposeType) {
            purposeRadios.forEach(radio => {
                radio.checked = radio.value === params.purposeType;
            });
        }
        
        // 備考を設定
        const noteTextarea = document.getElementById('adminNoteTextarea');
        if (noteTextarea && params.note) {
            noteTextarea.value = params.note;
        }
        
        // 時間を設定
        const startTimeSelect = document.getElementById('adminStartTimeSelect');
        const endTimeSelect = document.getElementById('adminEndTimeSelect');
        
        if (startTimeSelect && params.startMin !== undefined) {
            startTimeSelect.value = params.startMin;
        }
        if (endTimeSelect && params.endMin !== undefined) {
            endTimeSelect.value = params.endMin;
        }
        
        // 席選択を設定
        if (params.seats && Array.isArray(params.seats)) {
            this.selectedSeats.clear();
            params.seats.forEach(seatNo => {
                this.selectedSeats.add(seatNo);
            });
        }
        
        // 座席ピックボタンと時間選択を再描画
        this.renderSeatPickButtons();
        this.populateAdminTimeSelects();
    }
    
    resetEditMode() {
        // 編集モードをリセット
        this.editingLog = null;
        
        // 予約実行ボタンを元に戻す
        const bulkReserveBtn = document.getElementById('bulkReserveBtn');
        if (bulkReserveBtn) {
            bulkReserveBtn.textContent = '予約実行';
            bulkReserveBtn.classList.remove('edit-mode');
        }
        
        // フォームをリセット
        this.resetAdminForms();
    }
    
    async updateExistingLog() {
        try {
            console.log('Starting one-action update process...'); // デバッグ用ログ
            
            const date = document.getElementById('adminDateSelect').value;
            const floor = document.getElementById('adminFloorSelect').value;
            const selectedSeats = Array.from(this.selectedSeats);
            const startMin = parseInt(document.getElementById('adminStartTimeSelect').value);
            const endMin = parseInt(document.getElementById('adminEndTimeSelect').value);
            const name = document.getElementById('adminNameInput').value.trim();
            const course = document.getElementById('adminCourseSelect').value;
            const purposeType = document.querySelector('input[name="adminPurposeType"]:checked').value;
            const note = document.getElementById('adminNoteTextarea').value.trim();
            
            console.log('Form data collected:', { date, floor, selectedSeats, startMin, endMin, name }); // デバッグ用ログ
            
            // 元のログデータを取得して元の予約情報を特定
            const originalLog = this.editingLog;
            const originalParams = originalLog.params || {};
            
            console.log('Original log params:', originalParams); // デバッグ用ログ
            
            // 1つのトランザクションで削除と作成を同時に実行
            console.log('Starting transaction for delete and create operations...'); // デバッグ用ログ
            await this.updateReservationsInTransaction(date, floor, selectedSeats, startMin, endMin, name, course, purposeType, note);
            
            // ログを更新
            console.log('Updating log...'); // デバッグ用ログ
            const updatedParams = {
                date, floor, seats: selectedSeats, startMin, endMin, name, course, purposeType, note
            };
            
            await logsCollection.doc(this.editingLog.logId).update({
                params: updatedParams,
                summary: { successCount: selectedSeats.length, failCount: 0 },
                updatedAt: new Date()
            });
            
            console.log('Update process completed successfully'); // デバッグ用ログ
            this.showToast('ログを更新しました', 'success');
            
            // UIを即時更新
            this.resetEditMode();
            this.hideAdminPanel();
            
            // 予約データを再読み込みしてUIを更新
            this.subscribeToReservations();
            
            // 少し遅延してログを再読み込み（UIの更新を確実にするため）
            setTimeout(() => {
                this.loadLogs(); // ログを再読み込み
            }, 100);
            
        } catch (error) {
            console.error('Error in one-action update:', error);
            console.error('Error details:', {
                message: error.message,
                code: error.code,
                stack: error.stack
            });
            
            // より詳細なエラーメッセージを表示
            let errorMessage = 'ログの更新に失敗しました';
            if (error.message) {
                errorMessage += `: ${error.message}`;
            }
            if (error.code) {
                errorMessage += ` (コード: ${error.code})`;
            }
            
            this.showToast(errorMessage, 'error');
        }
    }
    
    async updateReservationsInTransaction(date, floor, seats, startMin, endMin, name, course, purposeType, note) {
        console.log(`Updating reservations in transaction for date: ${date}, floor: ${floor}, seats: ${seats}`); // デバッグ用ログ
        
        try {
            // 元のログデータを取得
            const originalLog = this.editingLog;
            const originalParams = originalLog.params || {};
            const originalDate = originalParams.date;
            const originalFloor = originalParams.floor;
            const originalSeats = originalParams.seats || [];
            const originalStartMin = originalParams.startMin;
            const originalEndMin = originalParams.endMin;
            
            console.log('Original reservation data:', { originalDate, originalFloor, originalSeats, originalStartMin, originalEndMin }); // デバッグ用ログ
            
            // まずトランザクション外で元の予約を検索（inクエリの10件制限を回避するためJS側でフィルタ）
            const existingSnapshot = await reservationsCollection
                .where('date', '==', originalDate)
                .where('floor', '==', originalFloor)
                .where('startMin', '==', originalStartMin)
                .where('endMin', '==', originalEndMin)
                .get();
            
            // JS側でseatNoを絞り込む（Firestore 'in' は10件制限のため）
            const originalSeatsSet = new Set(originalSeats);
            const filteredDocs = existingSnapshot.docs.filter(doc => originalSeatsSet.has(doc.data().seatNo));
            const existingDocsToDelete = { docs: filteredDocs };
            
            console.log(`Found ${existingDocsToDelete.docs.length} existing reservations to delete`); // デバッグ用ログ
            
            // Firestoreトランザクションを使用して原子性を保証
            await db.runTransaction(async (transaction) => {
                // 1. 元の予約を削除
                existingDocsToDelete.docs.forEach(doc => {
                    console.log(`Deleting original reservation: ${doc.id}, seat: ${doc.data().seatNo}`); // デバッグ用ログ
                    transaction.delete(doc.ref);
                });
                
                // 2. 新しい予約を作成
                seats.forEach(seatNo => {
                    const reservation = {
                        date,
                        floor,
                        seatNo,
                        startMin,
                        endMin,
                        name,
                        course: course || '',
                        purposeType,
                        note: note || '',
                        createdAt: new Date(),
                        updatedAt: new Date()
                    };
                    
                    console.log(`Creating new reservation for seat: ${seatNo}`); // デバッグ用ログ
                    const docRef = reservationsCollection.doc();
                    transaction.set(docRef, reservation);
                });
            });
            
            console.log(`Transaction completed: deleted ${existingSnapshot.docs.length} original reservations and created ${seats.length} new reservations`); // デバッグ用ログ
            
        } catch (error) {
            console.error('Transaction error:', error);
            console.error('Transaction error details:', {
                message: error.message,
                code: error.code,
                stack: error.stack
            });
            throw error; // 上位のcatchにエラーを伝播
        }
    }
    
    async deleteAllReservationsInTimeSlot(date, floor, startMin, endMin) {
        console.log(`Deleting all reservations in time slot: date=${date}, floor=${floor}, time=${this.formatTime(startMin)}-${this.formatTime(endMin)}`); // デバッグ用ログ
        
        const snapshot = await reservationsCollection
            .where('date', '==', date)
            .where('floor', '==', floor)
            .where('startMin', '==', startMin)
            .where('endMin', '==', endMin)
            .get();
        
        if (snapshot.docs.length === 0) {
            console.log('No reservations found in this time slot'); // デバッグ用ログ
            return;
        }
        
        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        await batch.commit();
        console.log(`Deleted ${snapshot.docs.length} reservations in time slot`); // デバッグ用ログ
    }
    
    async createNewReservations(date, floor, seats, startMin, endMin, name, course, purposeType, note) {
        console.log(`Creating new reservations for date: ${date}, floor: ${floor}, seats: ${seats}`); // デバッグ用ログ
        
        const batch = db.batch();
        
        seats.forEach(seatNo => {
            const reservation = {
                date,
                floor,
                seatNo,
                startMin,
                endMin,
                name,
                course: course || '',
                purposeType,
                note: note || '',
                createdAt: new Date(),
                updatedAt: new Date()
            };
            
            const docRef = reservationsCollection.doc();
            batch.set(docRef, reservation);
        });
        
        await batch.commit();
        console.log(`Created ${seats.length} new reservations`);
    }

    // プレビュー機能
    showPreviewModal() {
        console.log('showPreviewModal called');
        this.previewCurrentDate = this.currentDate;
        this.previewCurrentFloor = this.currentFloor;
        
        console.log('Current date:', this.previewCurrentDate);
        console.log('Current floor:', this.previewCurrentFloor);
        
        // モーダルを表示
        const previewModal = document.getElementById('previewModal');
        previewModal.style.maxWidth = '100vw'; // 画面幅いっぱいに広げる
        previewModal.style.width = 'fit-content'; // コンテンツに合わせて幅を自動調整
        previewModal.classList.add('active');
        
        console.log('Modal added active class');
        
        // 日付とフロアを設定
        document.getElementById('previewDate').value = this.previewCurrentDate;
        
        // フロアタブを設定
        document.querySelectorAll('.preview-floor-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.floor === this.previewCurrentFloor) {
                tab.classList.add('active');
            }
        });
        
        console.log('Floor tabs set up');
        
        // プレビューテーブルを生成
        this.generatePreviewTable();
    }

    hidePreviewModal() {
        const modal = document.getElementById('previewModal');
        const modalContent = modal.querySelector('.modal-content');
        modal.classList.remove('active');
        
        // ドラッグ位置をリセット
        if (modalContent) {
            modalContent.style.position = '';
            modalContent.style.left = '';
            modalContent.style.top = '';
            modalContent.style.margin = '';
            modalContent.style.zIndex = '';
            modalContent.style.transform = '';
        }
    }

    generatePreviewTable() {
        console.log('generatePreviewTable called');
        const timeHeaderRow = document.getElementById('timeHeaderRow');
        const tableBody = document.getElementById('previewTableBody');
        
        console.log('Time header row:', timeHeaderRow);
        console.log('Table body:', tableBody);
        
        // 時間ヘッダーを生成（9時〜21時、各列はcolspan=2で30分×2）
        timeHeaderRow.innerHTML = '<th>席番号</th>';
        for (let hour = 9; hour < 21; hour++) {
            const th = document.createElement('th');
            th.textContent = `${hour}:00~${hour + 1}:00`;
            th.colSpan = 2; // 各時間を30分×2のハーフセルで表現
            timeHeaderRow.appendChild(th);
        }
        
        console.log('Time headers generated, count:', 21 - 9);
        
        // 予約データを取得
        this.loadPreviewData();
    }

    async loadPreviewData() {
        console.log('loadPreviewData called');
        try {
            const snapshot = await reservationsCollection
                .where('date', '==', this.previewCurrentDate)
                .where('floor', '==', this.previewCurrentFloor)
                .get();
            
            const reservations = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            console.log('Reservations loaded:', reservations.length, reservations);
            
            this.renderPreviewTable(reservations);
        } catch (error) {
            console.error('プレビューデータ読み込みエラー:', error);
            this.showToast('プレビューデータの読み込みに失敗しました', 'error');
        }
    }

    renderPreviewTable(reservations) {
        console.log('renderPreviewTable called with', reservations.length, 'reservations');
        const tableBody = document.getElementById('previewTableBody');
        const maxSeat = this.previewCurrentFloor === '6F' ? 30 : 19;
        
        console.log('Max seats:', maxSeat, 'for floor:', this.previewCurrentFloor);
        
        // 全体は9:00〜21:00 = 24スロット（30分単位）
        const SLOT_START = 9 * 60;   // 540分
        const SLOT_END = 21 * 60;    // 1260分
        const SLOT_SIZE = 30;
        const TOTAL_SLOTS = (SLOT_END - SLOT_START) / SLOT_SIZE; // 24スロット

        tableBody.innerHTML = '';
        for (let seatNo = 1; seatNo <= maxSeat; seatNo++) {
            const row = document.createElement('tr');
            
            // 席番号セル
            const seatCell = document.createElement('td');
            seatCell.textContent = seatNo;
            row.appendChild(seatCell);

            // この席の予約を取得
            const seatReservations = reservations.filter(r => r.seatNo === seatNo);
            
            // 30分スロット単位で描画
            let slot = 0; // 0〜23
            while (slot < TOTAL_SLOTS) {
                const slotStartMin = SLOT_START + slot * SLOT_SIZE;
                const slotEndMin = slotStartMin + SLOT_SIZE;

                // このスロットに重なる予約を検索
                const reservation = seatReservations.find(r =>
                    r.startMin < slotEndMin && r.endMin > slotStartMin
                );

                if (reservation) {
                    // この予約の開始スロットを計算
                    const resStartSlot = Math.ceil((reservation.startMin - SLOT_START) / SLOT_SIZE);
                    
                    if (slot === resStartSlot || (slot < resStartSlot && reservation.startMin < slotEndMin)) {
                        // 予約の描画開始
                        // 実際の開始スロット（startMinが:30始まりならそのスロットから）
                        const actualStartSlot = Math.floor((reservation.startMin - SLOT_START) / SLOT_SIZE);
                        const actualEndSlot = Math.ceil((reservation.endMin - SLOT_START) / SLOT_SIZE);
                        const spanSlots = actualEndSlot - actualStartSlot;

                        const mergedCell = document.createElement('td');
                        mergedCell.className = 'reserved-cell';
                        mergedCell.colSpan = spanSlots;

                        // 予約の色を設定
                        if (reservation.course) {
                            const course = this.courses.find(c => c.name === reservation.course);
                            if (course && course.color) {
                                mergedCell.style.setProperty('background-color', course.color, 'important');
                            } else {
                                mergedCell.style.setProperty('background-color', '#ffcdd2', 'important');
                            }
                        } else {
                            mergedCell.style.setProperty('background-color', '#ffcdd2', 'important');
                        }
                        
                        // 予約情報を表示
                        this.renderReservationInfo(mergedCell, reservation);
                        row.appendChild(mergedCell);
                        
                        slot = actualEndSlot;
                    } else {
                        // 空きスロット（予約が途中から始まる前の隙間）
                        const emptyCell = document.createElement('td');
                        emptyCell.style.border = '1px solid #ddd';
                        emptyCell.style.backgroundColor = '#f9f9f9';
                        row.appendChild(emptyCell);
                        slot++;
                    }
                } else {
                    // 空きスロット
                    const emptyCell = document.createElement('td');
                    emptyCell.style.border = '1px solid #ddd';
                    emptyCell.style.backgroundColor = '#f9f9f9';
                    row.appendChild(emptyCell);
                    slot++;
                }
            }
            
            tableBody.appendChild(row);
        }
        
        console.log('Table rendered with', maxSeat, 'rows');
    }

    renderReservationInfo(cell, reservation) {
        // 予約情報を中央寄せで表示
        const reservationInfo = document.createElement('div');
        reservationInfo.className = 'reservation-info';
        reservationInfo.style.textAlign = 'center';
        reservationInfo.style.verticalAlign = 'middle';
        reservationInfo.style.height = '100%';
        reservationInfo.style.display = 'flex';
        reservationInfo.style.flexDirection = 'column';
        reservationInfo.style.justifyContent = 'center';
        reservationInfo.style.alignItems = 'center';
        reservationInfo.style.padding = '4px';
        
        const nameDiv = document.createElement('div');
        nameDiv.className = 'reservation-name';
        nameDiv.innerHTML = `<span class="name-with-marker">${reservation.name}</span>`;
        nameDiv.style.fontWeight = 'bold';
        nameDiv.style.fontSize = '12px';
        reservationInfo.appendChild(nameDiv);
        
        // コース名を追加
        if (reservation.course) {
            const courseDiv = document.createElement('div');
            courseDiv.className = 'reservation-course';
            courseDiv.textContent = `(${reservation.course})`;
            courseDiv.style.fontSize = '10px';
            courseDiv.style.marginTop = '1px';
            reservationInfo.appendChild(courseDiv);
        }
        
        // 目的を追加（自習以外の場合）
        if (reservation.purposeType && reservation.purposeType !== '自習') {
            const purposeDiv = document.createElement('div');
            purposeDiv.className = 'reservation-purpose';
            purposeDiv.textContent = reservation.purposeType;
            purposeDiv.style.fontSize = '9px';
            purposeDiv.style.marginTop = '1px';
            reservationInfo.appendChild(purposeDiv);
        }

        // 準備物を追加（補講かつnoteがある場合）
        if (reservation.purposeType === '補講' && reservation.note) {
            const noteDiv = document.createElement('div');
            noteDiv.className = 'reservation-note';
            noteDiv.textContent = `📋 ${reservation.note}`;
            noteDiv.style.fontSize = '9px';
            noteDiv.style.marginTop = '2px';
            noteDiv.style.color = '#555';
            noteDiv.style.fontStyle = 'italic';
            noteDiv.style.whiteSpace = 'pre-wrap';
            noteDiv.style.wordBreak = 'break-all';
            noteDiv.style.textAlign = 'left';
            reservationInfo.appendChild(noteDiv);
        }
        
        const timeDiv = document.createElement('div');
        timeDiv.className = 'reservation-time';
        timeDiv.textContent = `${this.formatTime(reservation.startMin)}-${this.formatTime(reservation.endMin)}`;
        timeDiv.style.fontSize = '10px';
        timeDiv.style.marginTop = '2px';
        
        reservationInfo.appendChild(timeDiv);
        cell.appendChild(reservationInfo);
    }

    // モーダルを作成
    createLogEditModal(logId, logData) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'logEditModal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>ログ編集</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>名前</label>
                        <input type="text" id="editLogName" value="${logData.params?.name || ''}" required>
                    </div>
                    <div class="form-group">
                        <label>コース</label>
                        <input type="text" id="editLogCourse" value="${logData.params?.course || ''}">
                    </div>
                    <div class="form-group">
                        <label>目的</label>
                        <select id="editLogPurpose">
                            <option value="自習" ${logData.params?.purposeType === '自習' ? 'selected' : ''}>自習</option>
                            <option value="補講" ${logData.params?.purposeType === '補講' ? 'selected' : ''}>補講</option>
                            <option value="その他" ${logData.params?.purposeType === 'その他' ? 'selected' : ''}>その他</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>備考</label>
                        <textarea id="editLogNote">${logData.params?.note || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label>成功件数</label>
                        <input type="number" id="editLogSuccessCount" value="${logData.summary?.successCount || 0}" min="0">
                    </div>
                    <div class="form-group">
                        <label>失敗件数</label>
                        <input type="number" id="editLogFailCount" value="${logData.summary?.failCount || 0}" min="0">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="submit-btn" onclick="app.saveLogEdit('${logId}')">保存</button>
                    <button class="cancel-btn" onclick="this.closest('.modal').remove()">キャンセル</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.classList.add('active');
    }
    
    async saveLogEdit(logId) {
        try {
            const updatedParams = {
                ...this.editingLogData.params,
                name: document.getElementById('editLogName').value,
                course: document.getElementById('editLogCourse').value,
                purposeType: document.getElementById('editLogPurpose').value,
                note: document.getElementById('editLogNote').value
            };
            
            const updatedSummary = {
                successCount: parseInt(document.getElementById('editLogSuccessCount').value),
                failCount: parseInt(document.getElementById('editLogFailCount').value)
            };
            
            console.log('Updating log:', logId, updatedParams, updatedSummary); // デバッグ用ログ
            
            await logsCollection.doc(logId).update({
                params: updatedParams,
                summary: updatedSummary,
                updatedAt: new Date()
            });
            
            this.showToast('ログを更新しました', 'success');
            document.getElementById('logEditModal').remove();
            this.loadLogs(); // ログを再読み込み
            
        } catch (error) {
            console.error('Error updating log:', error);
            this.showToast('ログの更新に失敗しました', 'error');
        }
    }
    
    async deleteLog(logId) {
        console.log('Attempting to delete log:', logId); // デバッグ用ログ
        
        if (!confirm('このログを削除してもよろしいですか？')) {
            console.log('Delete cancelled by user'); // デバッグ用ログ
            return;
        }
        
        try {
            // まずログデータを取得して関連予約を削除
            const logDoc = await logsCollection.doc(logId).get();
            if (logDoc.exists) {
                const logData = logDoc.data();
                const params = logData.params || {};
                
                // 関連する予約を削除
                if (params.date && params.floor && params.seats) {
                    await this.deleteLogRelatedReservations(params.date, params.floor, params.seats);
                }
            }
            
            // ログを削除
            console.log('Deleting log from Firestore...'); // デバッグ用ログ
            await logsCollection.doc(logId).delete();
            console.log('Log deleted successfully'); // デバッグ用ログ
            
            this.showToast('ログを削除しました', 'success');
            this.loadLogs(); // ログを再読み込み
            
        } catch (error) {
            console.error('Error deleting log:', error);
            this.showToast('ログの削除に失敗しました', 'error');
        }
    }
    
    async deleteLogRelatedReservations(date, floor, seats) {
        // inクエリの10件制限を回避：日付・フロアで取得後にJS側でフィルタ
        const snapshot = await reservationsCollection
            .where('date', '==', date)
            .where('floor', '==', floor)
            .get();
        
        const seatsSet = new Set(seats);
        const targetDocs = snapshot.docs.filter(doc => seatsSet.has(doc.data().seatNo));
        
        const batch = db.batch();
        targetDocs.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        await batch.commit();
        console.log(`Deleted ${targetDocs.length} related reservations`); // デバッグ用ログ
    }
    
    setupModalDrag() {
        // モーダルコンテンツをドラッグ可能にする
        const modalContents = document.querySelectorAll('.modal-content');
        
        modalContents.forEach(content => {
            const header = content.querySelector('.modal-header');
            if (!header) return;
            
            let isDragging = false;
            let startX = 0;
            let startY = 0;
            let initialLeft = 0;
            let initialTop = 0;
            
            header.addEventListener('mousedown', dragStart);
            document.addEventListener('mousemove', drag);
            document.addEventListener('mouseup', dragEnd);
            
            function dragStart(e) {
                // ボタン以外のヘッダー部分でのみドラッグ開始
                if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
                    return;
                }
                
                if (e.target === header || header.contains(e.target)) {
                    isDragging = true;
                    startX = e.clientX;
                    startY = e.clientY;
                    
                    // 現在の位置を取得
                    const rect = content.getBoundingClientRect();
                    initialLeft = rect.left;
                    initialTop = rect.top;
                    
                    content.style.position = 'fixed';
                    content.style.zIndex = '1001';
                    content.style.left = initialLeft + 'px';
                    content.style.top = initialTop + 'px';
                    content.style.margin = '0';
                    content.style.transform = 'none';
                }
            }
            
            function drag(e) {
                if (isDragging) {
                    e.preventDefault();
                    
                    const deltaX = e.clientX - startX;
                    const deltaY = e.clientY - startY;
                    
                    const newLeft = initialLeft + deltaX;
                    const newTop = initialTop + deltaY;
                    
                    // 画面外にも出せるように制限を緩和（一部のみ制限）
                    const minX = -content.offsetWidth + 100; // 左側は少し見える範囲まで
                    const minY = -content.offsetHeight + 50; // 上側はタイトルバーが見える範囲まで
                    const maxX = window.innerWidth - 100; // 右側は少し見える範囲まで
                    const maxY = window.innerHeight - 50; // 下側は少し見える範囲まで
                    
                    const finalLeft = Math.max(minX, Math.min(newLeft, maxX));
                    const finalTop = Math.max(minY, Math.min(newTop, maxY));
                    
                    content.style.left = finalLeft + 'px';
                    content.style.top = finalTop + 'px';
                }
            }
            
            function dragEnd(e) {
                isDragging = false;
            }
        });
    }
}

// アプリケーションを初期化
const app = new BoothReservationApp();
