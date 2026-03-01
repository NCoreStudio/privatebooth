class BoothReservationApp {
    constructor() {
        this.currentDate = this.getTodayLocalDate();
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
        this.previewCurrentDate = this.getTodayLocalDate();
        
        this.init();
    }

    // UTC変換を避けてローカル日付を取得（JST環境での日付ズレ防止）
    getTodayLocalDate() {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    toLocalDateString(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
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
            console.log('Side submit button clicked');
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
            this.resetAdminForms();
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
                
                console.log('Bulk reserve button clicked');
                
                if (this.editingLog) {
                    console.log('Updating existing log');
                    this.updateExistingLog();
                } else {
                    console.log('Creating new bulk reservation');
                    
                    const useRecurring = document.getElementById('useRecurring');
                    if (useRecurring && useRecurring.checked) {
                        console.log('Calling reserveRecurringFromBulkUI');
                        this.reserveRecurringFromBulkUI();
                    } else {
                        console.log('Calling bulkReserve');
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
            this.selectedSeats.clear();
            this.renderSeatPickButtons();
        });

        // 当日の予約を全て削除ボタン
        document.getElementById('deleteAllTodayBtn').addEventListener('click', () => {
            this.deleteAllTodayReservations();
        });
    }

    initializeDateSelector() {
        const dateSelect = document.getElementById('dateSelect');
        dateSelect.value = this.currentDate;
        
        this.updateWeekdayDisplay();
        
        document.getElementById('adminDateSelect').value = this.currentDate;
        document.getElementById('recurringStartDate').value = this.currentDate;
        document.getElementById('recurringEndDate').value = this.currentDate;
    }

    navigateDate(direction) {
        const currentDate = new Date(this.currentDate);
        currentDate.setDate(currentDate.getDate() + direction);
        
        const newDate = this.toLocalDateString(currentDate);
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
            
            this.courses.sort((a, b) => {
                const aOrder = a.order !== undefined ? a.order : 9999;
                const bOrder = b.order !== undefined ? b.order : 9999;
                return aOrder - bOrder;
            });
            
            this.updateCourseSelects();
            
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
        seatInfo.textContent = '';
        
        seatElement.appendChild(seatNumber);
        seatElement.appendChild(seatInfo);
        
        seatElement.addEventListener('click', () => {
            this.showSidePanel(seatNo);
        });
        
        return seatElement;
    }

    updateSeatColors() {
        const allSeatElements = document.querySelectorAll('.seat');
        const currentFloorSeats = Array.from(allSeatElements).filter(element =>
            element.className.includes(`seat-${this.currentFloor.toLowerCase()}-`)
        );

        currentFloorSeats.forEach(seatElement => {
            const seatNo = parseInt(seatElement.dataset.seat);
            const seatReservations = this.reservations.filter(r =>
                r.seatNo === seatNo && r.floor === this.currentFloor
            );

            seatElement.classList.remove('reserved', 'selected', 'multi-reserved');
            seatElement.style.backgroundColor = '';

            const seatNumber = seatElement.querySelector('.seat-number');

            if (seatNumber) seatNumber.style.display = '';

            Array.from(seatElement.children).forEach(child => {
                if (!child.classList.contains('seat-number')) child.remove();
            });

            if (seatReservations.length === 0) {
                const seatInfo = document.createElement('div');
                seatInfo.className = 'seat-info';
                seatElement.appendChild(seatInfo);
                return;
            }

            if (seatReservations.length === 1) {
                const reservation = seatReservations[0];

                // --- 3段構成: 座席番号(seatNumber済み) / 名前 / コース名 ---
                // 名前行
                const nameRow = document.createElement('div');
                nameRow.className = 'seat-name-row';
                const nameSpan = document.createElement('span');
                nameSpan.className = 'name-with-marker';
                nameSpan.textContent = reservation.name;
                nameRow.appendChild(nameSpan);
                seatElement.appendChild(nameRow);

                // コース名行（ある場合のみ）
                if (reservation.course) {
                    const courseRow = document.createElement('div');
                    courseRow.className = 'seat-course-row';
                    courseRow.textContent = reservation.course;
                    seatElement.appendChild(courseRow);
                }

                // 目的行（自習以外）
                if (reservation.purposeType && reservation.purposeType !== '自習') {
                    const purposeRow = document.createElement('div');
                    purposeRow.className = 'seat-purpose-row';
                    purposeRow.textContent = reservation.purposeType;
                    seatElement.appendChild(purposeRow);
                }

                seatElement.classList.add('reserved');
                const course = this.courses.find(c => c.name === reservation.course);
                if (course && course.color) {
                    seatElement.style.backgroundColor = course.color;
                }
            } else {
                seatElement.classList.add('reserved', 'multi-reserved');
                seatElement.style.backgroundColor = 'transparent';

                if (seatNumber) seatNumber.style.display = 'none';

                const sorted = [...seatReservations].sort((a, b) => a.startMin - b.startMin);

                const splitContainer = document.createElement('div');
                splitContainer.className = 'seat-split-container';

                sorted.forEach((reservation, idx) => {
                    const block = document.createElement('div');
                    block.className = 'seat-split-block';

                    const course = this.courses.find(c => c.name === reservation.course);
                    if (course && course.color) {
                        block.style.backgroundColor = course.color;
                    } else {
                        block.style.backgroundColor = '#ffcdd2';
                    }

                    if (idx === 0) {
                        const numBadge = document.createElement('span');
                        numBadge.className = 'seat-split-num';
                        numBadge.textContent = seatNo;
                        block.appendChild(numBadge);
                    }

                    const nameSpan = document.createElement('span');
                    nameSpan.className = 'name-with-marker';
                    nameSpan.textContent = reservation.name;
                    block.appendChild(nameSpan);

                    if (reservation.course) {
                        const courseSpan = document.createElement('span');
                        courseSpan.className = 'seat-split-course';
                        courseSpan.textContent = `(${reservation.course})`;
                        block.appendChild(courseSpan);
                    }

                    if (reservation.purposeType && reservation.purposeType !== '自習') {
                        const purposeSpan = document.createElement('span');
                        purposeSpan.className = 'seat-split-purpose';
                        purposeSpan.textContent = reservation.purposeType;
                        block.appendChild(purposeSpan);
                    }

                    splitContainer.appendChild(block);
                });

                seatElement.appendChild(splitContainer);
            }
        });

        // DOM描画後にフォントを自動縮小して枠内に収める
        requestAnimationFrame(() => { this.fitAllSeatText(); });
    }

    /**
     * 全座席のテキストを枠内に収まるよう自動縮小する。
     * 名前・コース名それぞれを1行(nowrap)で収める。
     */
    fitAllSeatText() {
        // 座席の実際のサイズからフォント上限を動的に算出する
        // 座席幅の約25%を名前フォント上限の基準にする（比例スケーリング）
        const calcMaxFont = (seatW, ratio) => Math.min(Math.max(seatW * ratio, 8), 999);

        // ---- 1件予約: 座席番号・名前・コース名を各行1行で縮小 ----
        document.querySelectorAll('.seat:not(.multi-reserved)').forEach(seat => {
            const w = seat.clientWidth - 10; // 左右パディング分

            // 座席番号: 幅の22%を上限（最小12px）
            const numEl = seat.querySelector('.seat-number');
            if (numEl) this._fitTextToWidth(numEl, w, calcMaxFont(w, 0.22), 12);

            // 名前（最重要: 幅の18%を上限、最小8px）
            const nameEl = seat.querySelector('.seat-name-row .name-with-marker');
            if (nameEl) this._fitTextToWidth(nameEl, w, calcMaxFont(w, 0.18), 8);

            // コース名（名前より小さめ: 幅の13%を上限）
            const courseEl = seat.querySelector('.seat-course-row');
            if (courseEl) this._fitTextToWidth(courseEl, w, calcMaxFont(w, 0.13), 7);

            // 目的（補講・その他）
            const purposeEl = seat.querySelector('.seat-purpose-row');
            if (purposeEl) this._fitTextToWidth(purposeEl, w, calcMaxFont(w, 0.12), 7);
        });

        // ---- 複数予約: 各 .seat-split-block 内の要素を個別縮小 ----
        document.querySelectorAll('.seat-split-block').forEach(block => {
            const blockW = block.clientWidth - 6;
            const calcB = (r) => calcMaxFont(blockW, r);

            const nameEl    = block.querySelector('.name-with-marker');
            const courseEl  = block.querySelector('.seat-split-course');
            const purposeEl = block.querySelector('.seat-split-purpose');
            const numEl     = block.querySelector('.seat-split-num');

            if (numEl)     this._fitTextToWidth(numEl,     blockW - 4, calcB(0.20), 7);
            if (nameEl)    this._fitTextToWidth(nameEl,    blockW,     calcB(0.17), 6);
            if (courseEl)  this._fitTextToWidth(courseEl,  blockW,     calcB(0.13), 6);
            if (purposeEl) this._fitTextToWidth(purposeEl, blockW,     calcB(0.12), 6);
        });
    }

    /**
     * el のテキストを1行(white-space:nowrap)のまま maxWidth 内に収まるまでフォント縮小。
     */
    _fitTextToWidth(el, maxWidth, maxSize, minSize) {
        el.style.whiteSpace = 'nowrap';
        el.style.fontSize = maxSize + 'px';
        let size = maxSize;
        while (size > minSize && el.scrollWidth > maxWidth) {
            size -= 0.5;
            el.style.fontSize = size + 'px';
        }
    }

    resetSideForm() {
        document.getElementById('sideNameInput').value = '';
        const sideCourseHidden = document.getElementById('sideCourseSelect');
        if (sideCourseHidden) sideCourseHidden.value = '';
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
        
        document.getElementById('sideStartTimeSelect').value = 9 * 60;
        document.getElementById('sideEndTimeSelect').value = 10 * 60;
    }

    resetAdminForms() {
        document.getElementById('adminNameInput').value = '';
        document.getElementById('adminCourseSelect').value = '';
        document.querySelector('input[name="adminPurposeType"][value="自習"]').checked = true;
        document.getElementById('adminNoteTextarea').value = '';
        document.getElementById('adminNoteTextarea').style.display = 'none';
        
        this.selectedSeats.clear();
        
        const bulkResults = document.getElementById('bulkResults');
        if (bulkResults) {
            bulkResults.innerHTML = '';
        }
        
        document.getElementById('useRecurring').checked = false;
        document.getElementById('recurringOptions').style.display = 'none';
        document.getElementById('recurringStartDate').value = this.currentDate;
        document.getElementById('recurringEndDate').value = this.currentDate;
        
        document.querySelectorAll('input[name="weekday"]:checked').forEach(checkbox => {
            checkbox.checked = false;
        });
        
        this.editingLog = null;
    }

    async submitReservation() {
        console.log('Single seat reservation started');
        
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
            
            const savePromise = reservationsCollection.add(reservation);
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Single reservation save timeout')), 500);
            });
            
            try {
                await Promise.race([savePromise, timeoutPromise]);
            } catch (saveError) {
                console.error('Single reservation save failed or timed out:', saveError);
            }
            
            this.resetSideForm();
            this.showToast('予約完了', 'success');
            
            setTimeout(() => {
                this.updateSeatColors();
            }, 100);
            
            setTimeout(() => {
                this.hideSidePanel();
            }, 50);
            
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
        document.body.style.overflow = 'hidden';
        
        this.resetAdminForms();
        
        this.renderSeatPickButtons();
        this.populateAdminTimeSelects();
    }

    hideAdminPanel() {
        const modal = document.getElementById('adminPanel');
        const modalContent = modal.querySelector('.modal-content');
        document.body.style.overflow = '';
        if (modal) {
            modal.classList.remove('active');
            
            if (modalContent) {
                modalContent.style.position = '';
                modalContent.style.left = '';
                modalContent.style.top = '';
                modalContent.style.margin = '';
                modalContent.style.zIndex = '';
                modalContent.style.transform = '';
            }
            
            this.resetEditMode();
        }
    }

    renderSeatPickButtons() {
        const container = document.getElementById('seatPickContainer');
        container.innerHTML = '';
        
        const floor = document.getElementById('adminFloorSelect').value;
        const maxSeat = floor === '6F' ? 30 : 19;
        
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
        console.log('bulkReserve method started');
        
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
        
        const results = document.getElementById('bulkResults');
        results.innerHTML = '<h4>予約結果:</h4>';
        
        // [FIX①] batchId は1回だけ生成し、予約保存とログ保存の両方で同じ値を使う
        const batchId = this.generateBatchId();
        
        const batch = db.batch();
        
        let successCount = 0;
        let failCount = 0;
        const validSeats = [];
        
        for (const seatNo of selectedSeats) {
            try {
                const conflictingReservations = await this.checkConflictsForDate(
                    date, floor, seatNo, startMin, endMin
                );
                
                if (conflictingReservations.length > 0) {
                    const resultItem = document.createElement('div');
                    resultItem.className = 'result-item error';
                    resultItem.textContent = `席${seatNo}: 時間帯が重複しています`;
                    results.appendChild(resultItem);
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
                        batchId,  // [FIX①] 共通batchIdを使用
                        createdAt: new Date(),
                        updatedAt: new Date()
                    };
                    
                    const docRef = reservationsCollection.doc();
                    batch.set(docRef, reservation);
                    validSeats.push(seatNo);
                }
            } catch (error) {
                console.error('Error checking conflicts for seat', seatNo, ':', error);
                const resultItem = document.createElement('div');
                resultItem.className = 'result-item error';
                resultItem.textContent = `席${seatNo}: 予約失敗`;
                results.appendChild(resultItem);
                failCount++;
            }
        }
        
        if (validSeats.length > 0) {
            try {
                const commitPromise = batch.commit();
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Batch commit timeout')), 500);
                });
                
                try {
                    await Promise.race([commitPromise, timeoutPromise]);
                    successCount = validSeats.length;
                } catch (commitError) {
                    console.error('Batch commit failed or timed out:', commitError);
                    successCount = validSeats.length;
                }
                
                for (const seatNo of validSeats) {
                    const resultItem = document.createElement('div');
                    resultItem.className = 'result-item success';
                    resultItem.textContent = `席${seatNo}: 予約完了`;
                    results.appendChild(resultItem);
                }
            } catch (error) {
                console.error('バッチコミットエラー:', error);
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
        
        // [FIX①] ログ保存時も同じ batchId を使用（再宣言しない）
        try {
            const logData = {
                batchId,  // [FIX①] 共通batchIdを使用
                type: 'bulk',
                createdAt: new Date(),
                summary: { successCount, failCount },
                params: {
                    date, floor,
                    seats: selectedSeats.map(s => Number(s)),  // [FIX②] 必ず number型で保存
                    startMin, endMin, name, course, purposeType, note
                }
            };
            
            const savePromise = logsCollection.add(logData);
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Log save timeout')), 1000);
            });
            
            try {
                await Promise.race([savePromise, timeoutPromise]);
                console.log('Log saved successfully');
            } catch (logError) {
                console.error('Log save failed or timed out:', logError);
            }
        } catch (error) {
            console.error('ログ保存エラー:', error);
        }
        
        let toastMessage, toastType;
        
        if (successCount === 0) {
            toastMessage = '予約失敗：重複等で登録できませんでした';
            toastType = 'error';
            this.showToast(toastMessage, toastType);
            return;
        } else if (failCount === 0) {
            toastMessage = `予約完了：成功${successCount}件`;
            toastType = 'success';
        } else {
            toastMessage = `予約完了：成功${successCount}件 / 失敗${failCount}件（重複等）`;
            toastType = 'info';
        }
        
        this.showToast(toastMessage, toastType);
        
        if (successCount > 0) {
            setTimeout(() => {
                this.hideAdminPanel();
                this.resetAdminForms();
                this.selectedSeats.clear();
                this.renderSeatPickButtons();
                setTimeout(() => {
                    this.updateSeatColors();
                }, 100);
            }, 50);
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
        
        // [FIX①] batchId は1回だけ生成し、予約とログで共用
        const batchId = this.editingLog ? this.editingLog.batchId : this.generateBatchId();
        
        if (this.editingLog) {
            await this.deleteBatch(this.editingLog.batchId);
        }
        
        const start = new Date(startDate);
        const end = new Date(endDate);
        const dates = [];
        
        for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
            if (weekdays.includes(date.getDay())) {
                dates.push(this.toLocalDateString(new Date(date)));
            }
        }
        
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
                        allOperations.push({
                            date,
                            floor,
                            seatNo,
                            startMin,
                            endMin,
                            name,
                            course: course || '',
                            purposeType,
                            note: note || '',
                            batchId,  // [FIX①] 共通batchIdを使用
                            createdAt: new Date(),
                            updatedAt: new Date()
                        });
                    }
                } catch (error) {
                    failCount++;
                }
            }
        }
        
        const batchSize = 500;
        for (let i = 0; i < allOperations.length; i += batchSize) {
            const batch = db.batch();
            const chunk = allOperations.slice(i, i + batchSize);
            
            for (const reservation of chunk) {
                const docRef = reservationsCollection.doc();
                batch.set(docRef, reservation);
            }
            
            try {
                const commitPromise = batch.commit();
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Batch commit timeout')), 500);
                });
                
                try {
                    await Promise.race([commitPromise, timeoutPromise]);
                    successCount += chunk.length;
                } catch (commitError) {
                    console.error('Chunk batch commit failed or timed out:', commitError);
                    successCount += chunk.length;
                }
            } catch (error) {
                console.error('バッチコミットエラー:', error);
                failCount += chunk.length;
            }
        }
        
        const resultItem = document.createElement('div');
        resultItem.className = successCount > 0 ? 'result-item success' : 'result-item error';
        resultItem.textContent = `繰り返し予約完了：成功${successCount}件 / 失敗${failCount}件`;
        results.appendChild(resultItem);
        
        // [FIX①][FIX④] ログ保存時も同じ batchId を使用（再宣言しない）
        try {
            const logData = {
                batchId,  // [FIX①] 共通batchIdを使用
                type: 'recurring',
                createdAt: new Date(),
                summary: { successCount, failCount },
                params: {
                    startDate, endDate, weekdays, floor,
                    seats: selectedSeats.map(s => Number(s)),  // [FIX②] 必ず number型で保存
                    startMin, endMin, name, course, purposeType, note
                }
            };
            
            const savePromise = logsCollection.add(logData);
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Recurring log save timeout')), 1000);
            });
            
            try {
                await Promise.race([savePromise, timeoutPromise]);
                console.log('Recurring reservation log saved successfully');
            } catch (logError) {
                console.error('Recurring log save failed or timed out:', logError);
            }
        } catch (error) {
            console.error('繰り返し予約ログ保存エラー:', error);
        }
        
        let toastMessage, toastType;
        if (successCount === 0) {
            toastMessage = '予約失敗：重複等で登録できませんでした';
            toastType = 'error';
            this.showToast(toastMessage, toastType);
            return;
        } else if (failCount === 0) {
            toastMessage = this.editingLog ? `更新完了：成功${successCount}件` : `予約完了：成功${successCount}件`;
            toastType = 'success';
        } else {
            toastMessage = this.editingLog ? `更新完了：成功${successCount}件 / 失敗${failCount}件（重複等）` : `予約完了：成功${successCount}件 / 失敗${failCount}件（重複等）`;
            toastType = 'info';
        }
        
        this.showToast(toastMessage, toastType);
        
        setTimeout(() => {
            this.hideAdminPanel();
            this.resetAdminForms();
            this.selectedSeats.clear();
            this.renderSeatPickButtons();
            setTimeout(() => {
                this.updateSeatColors();
            }, 100);
        }, 50);
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

        const newOrder = [...this.courses];
        [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];

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
        
        this.reservations = [];
        
        this.unsubscribe = reservationsCollection
            .where('date', '==', this.currentDate)
            .where('floor', '==', this.currentFloor)
            .onSnapshot(snapshot => {
                this.reservations = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
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
            
            const purposeBadge = (reservation.purposeType && reservation.purposeType !== '自習')
                ? `<span style="font-size:11px;color:#e67e22;font-weight:bold;">【${reservation.purposeType}】</span> `
                : '';
            const noteHtml = (reservation.purposeType === '補講' || reservation.purposeType === 'その他') && reservation.note
                ? `<br><small class="note-text">📋 ${reservation.note}</small>`
                : '';
            
            item.innerHTML = `
                <div class="reservation-item-info">
                    <div class="reservation-time">${startTime} - ${endTime}</div>
                    <div class="reservation-name">${purposeBadge}${reservation.name}${reservation.course ? ` <span style="font-weight:normal;font-size:12px;color:#666;">(${reservation.course})</span>` : ''}</div>
                    ${noteHtml}
                </div>
                <div class="reservation-actions">
                    <button class="edit-reservation-btn" data-id="${reservation.id}">✏️ 編集</button>
                    <button class="duplicate-reservation-btn" data-id="${reservation.id}">📋 複製</button>
                    <button class="delete-btn" data-id="${reservation.id}">🗑 削除</button>
                </div>
            `;
            
            container.appendChild(item);
        });
        
        container.querySelectorAll('.edit-reservation-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const reservationId = e.target.dataset.id;
                const reservation = this.reservations.find(r => r.id === reservationId);
                if (reservation) {
                    this.editReservationFromSidebar(reservation);
                }
            });
        });

        container.querySelectorAll('.duplicate-reservation-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const reservationId = e.target.dataset.id;
                const reservation = this.reservations.find(r => r.id === reservationId);
                if (reservation) {
                    this.showDuplicateReservationModal(reservation);
                }
            });
        });

        container.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const reservationId = e.target.dataset.id;
                this.deleteReservation(reservationId);
            });
        });
    }

    editReservationFromSidebar(reservation) {
        const existingModal = document.getElementById('editReservationModal');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'editReservationModal';

        let startOptions = '';
        let endOptions = '';
        for (let m = 9 * 60; m <= 21 * 60; m += 30) {
            const t = this.formatTime(m);
            startOptions += `<option value="${m}" ${reservation.startMin === m ? 'selected' : ''}>${t}</option>`;
            endOptions += `<option value="${m}" ${reservation.endMin === m ? 'selected' : ''}>${t}</option>`;
        }

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
                        <label>席の移動</label>
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

    showDuplicateReservationModal(reservation) {
        const existingModal = document.getElementById('duplicateReservationModal');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'duplicateReservationModal';

        const nextDay = new Date(this.currentDate);
        nextDay.setDate(nextDay.getDate() + 1);
        const defaultDate = this.toLocalDateString(nextDay);

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
                    <button class="submit-btn">複製する</button>
                    <button class="cancel-btn" onclick="document.getElementById('duplicateReservationModal').remove()">キャンセル</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const submitBtn = modal.querySelector('.submit-btn');
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
        
        const panel = document.getElementById('sidePanel');
        const seatInfoText = document.getElementById('seatInfoText');
        
        seatInfoText.textContent = `席 ${seatNo}`;
        
        this.resetSideForm();
        this.populateSideTimeSelects();
        this.renderReservationsList();
        
        panel.classList.add('active');
        // スマホでパネルを開いたとき背景スクロールを止める
        if (window.innerWidth <= 768) {
            document.body.style.overflow = 'hidden';
        }
    }

    hideSidePanel() {
        const panel = document.getElementById('sidePanel');
        if (panel) panel.classList.remove('active');
        document.body.style.overflow = '';
        document.querySelectorAll('.seat').forEach(s => s.classList.remove('selected'));
        this.selectedSeat = null;
    }

    populateSideTimeSelects() {
        const startSelect = document.getElementById('sideStartTimeSelect');
        const endSelect = document.getElementById('sideEndTimeSelect');
        
        if (!startSelect || !endSelect) {
            console.error('Time select elements not found');
            return;
        }
        
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

    async deleteAllTodayReservations() {
        const dateStr = this.currentDate;
        const date = new Date(dateStr);
        const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
        const weekday = weekdays[date.getDay()];
        const displayDate = `${dateStr}（${weekday}）`;

        const confirmed = confirm(
            `【確認】${displayDate} の予約を全て削除します。\n\n` +
            `6F・7F 両フロアの全予約（管理者一括予約を含む）が削除されます。\n` +
            `この操作は元に戻せません。よろしいですか？`
        );
        if (!confirmed) return;

        try {
            // 6F・7F 両フロアを対象に当日の予約を全件取得
            const [snap6F, snap7F] = await Promise.all([
                reservationsCollection
                    .where('date', '==', dateStr)
                    .where('floor', '==', '6F')
                    .get(),
                reservationsCollection
                    .where('date', '==', dateStr)
                    .where('floor', '==', '7F')
                    .get()
            ]);

            const allDocs = [...snap6F.docs, ...snap7F.docs];

            if (allDocs.length === 0) {
                this.showToast('削除する予約がありません', 'info');
                return;
            }

            // 500件ずつバッチ削除
            const batchSize = 500;
            for (let i = 0; i < allDocs.length; i += batchSize) {
                const batch = db.batch();
                allDocs.slice(i, i + batchSize).forEach(doc => batch.delete(doc.ref));
                await batch.commit();
            }

            this.showToast(`${displayDate} の予約 ${allDocs.length}件 を削除しました`, 'success');

            // 画面を更新
            this.updateSeatColors();

        } catch (error) {
            console.error('当日予約削除エラー:', error);
            this.showToast('削除に失敗しました', 'error');
        }
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
        } catch (error) {
            console.error('Error loading logs:', error);
            this.showToast('ログの読み込みに失敗しました', 'error');
        }
    }
    
    renderLogsList(logs) {
        const container = document.getElementById('logsList');
        container.innerHTML = '';
        
        // [FIX⑤] 部分失敗ログも表示して孤児予約が削除できるようにする（successCount > 0 であれば表示）
        const successfulLogs = logs.filter(log => {
            const summary = log.summary || { successCount: 0, failCount: 0 };
            return summary.successCount > 0;  // failCount === 0 の条件を削除
        });
        
        if (successfulLogs.length === 0) {
            container.innerHTML = '<p>ログがありません</p>';
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
            
            // [FIX⑤] 部分失敗の場合は視覚的に区別
            const hasFailures = summary.failCount > 0;
            const summaryColor = hasFailures ? 'color:#e67e22;' : '';
            const summaryText = hasFailures
                ? `成功: ${summary.successCount || 0}件 / 失敗: ${summary.failCount}件`
                : `成功: ${summary.successCount || 0}件`;
            
            // [FIX⑥] 繰り返し予約の場合は日付範囲を表示
            const dateDisplay = log.type === 'recurring'
                ? `${params.startDate || '?'} ～ ${params.endDate || '?'}`
                : (params.date || '未設定');
            
            logItem.innerHTML = `
                <div class="log-header">
                    <span class="log-date">${dateStr} ${timeStr}</span>
                    <span class="log-type">${log.type || 'bulk'}</span>
                </div>
                <div class="log-summary" style="${summaryColor}">
                    ${summaryText}
                </div>
                <div class="log-details">
                    日付: ${dateDisplay} | 
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
        logsCollection.doc(logId).get().then(doc => {
            if (doc.exists) {
                const logData = doc.data();
                this.editingLog = logData;
                this.editingLog.logId = logId;
                
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
        document.getElementById('adminPanel').classList.add('active');
        
        document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
        
        const bulkTab = document.querySelector('[data-tab="bulk"]');
        const bulkTabContent = document.getElementById('bulkTab');
        
        if (bulkTab) bulkTab.classList.add('active');
        if (bulkTabContent) bulkTabContent.classList.add('active');
        
        this.populateEditForm(logData);
        
        const bulkReserveBtn = document.getElementById('bulkReserveBtn');
        if (bulkReserveBtn) {
            bulkReserveBtn.textContent = '更新';
            bulkReserveBtn.classList.add('edit-mode');
        }
        
        setTimeout(() => {
            this.loadLogs();
        }, 100);
    }
    
    populateEditForm(logData) {
        const params = logData.params || {};
        
        const dateSelect = document.getElementById('adminDateSelect');
        if (dateSelect && params.date) {
            dateSelect.value = params.date;
        }
        
        const floorSelect = document.getElementById('adminFloorSelect');
        if (floorSelect && params.floor) {
            floorSelect.value = params.floor;
            this.selectedSeats.clear();
        }
        
        const nameInput = document.getElementById('adminNameInput');
        if (nameInput && params.name) {
            nameInput.value = params.name;
        }
        
        const courseHidden = document.getElementById('adminCourseSelect');
        if (courseHidden && params.course) {
            courseHidden.value = params.course;
            setTimeout(() => this.updateCourseSelects(), 0);
        }
        
        const purposeRadios = document.querySelectorAll('input[name="adminPurposeType"]');
        if (purposeRadios && params.purposeType) {
            purposeRadios.forEach(radio => {
                radio.checked = radio.value === params.purposeType;
            });
        }
        
        const noteTextarea = document.getElementById('adminNoteTextarea');
        if (noteTextarea) {
            noteTextarea.value = params.note || '';
            // 目的に応じてテキストエリアの表示を更新
            if (params.purposeType === '補講' || params.purposeType === 'その他') {
                noteTextarea.style.display = 'block';
            }
        }
        
        // [FIX⑦] 席と時間の選択を正しい順序で設定
        // 1. まず席ボタンと時間セレクトを再描画
        if (params.seats && Array.isArray(params.seats)) {
            this.selectedSeats.clear();
            params.seats.forEach(seatNo => {
                this.selectedSeats.add(Number(seatNo));  // [FIX②] 必ずnumber型に変換
            });
        }
        
        this.renderSeatPickButtons();
        this.populateAdminTimeSelects();  // オプションを生成
        
        // 2. 生成後に値を設定（[FIX⑦] 順序修正）
        const startTimeSelect = document.getElementById('adminStartTimeSelect');
        const endTimeSelect = document.getElementById('adminEndTimeSelect');
        
        if (startTimeSelect && params.startMin !== undefined) {
            startTimeSelect.value = params.startMin;
        }
        if (endTimeSelect && params.endMin !== undefined) {
            endTimeSelect.value = params.endMin;
        }
        
        // 繰り返し予約の場合は設定を復元
        if (logData.type === 'recurring') {
            const useRecurring = document.getElementById('useRecurring');
            const recurringOptions = document.getElementById('recurringOptions');
            if (useRecurring && recurringOptions) {
                useRecurring.checked = true;
                recurringOptions.style.display = 'block';
            }
            
            if (params.startDate) {
                document.getElementById('recurringStartDate').value = params.startDate;
            }
            if (params.endDate) {
                document.getElementById('recurringEndDate').value = params.endDate;
            }
            if (params.weekdays && Array.isArray(params.weekdays)) {
                document.querySelectorAll('input[name="weekday"]').forEach(cb => {
                    cb.checked = params.weekdays.includes(parseInt(cb.value));
                });
            }
        }
    }
    
    resetEditMode() {
        this.editingLog = null;
        
        const bulkReserveBtn = document.getElementById('bulkReserveBtn');
        if (bulkReserveBtn) {
            bulkReserveBtn.textContent = '予約実行';
            bulkReserveBtn.classList.remove('edit-mode');
        }
        
        this.resetAdminForms();
    }
    
    async updateExistingLog() {
        try {
            const date = document.getElementById('adminDateSelect').value;
            const floor = document.getElementById('adminFloorSelect').value;
            const selectedSeats = Array.from(this.selectedSeats).map(s => Number(s));  // [FIX②] number型で統一
            const startMin = parseInt(document.getElementById('adminStartTimeSelect').value);
            const endMin = parseInt(document.getElementById('adminEndTimeSelect').value);
            const name = document.getElementById('adminNameInput').value.trim();
            const course = document.getElementById('adminCourseSelect').value;
            const purposeType = document.querySelector('input[name="adminPurposeType"]:checked').value;
            const note = document.getElementById('adminNoteTextarea').value.trim();
            
            const originalLog = this.editingLog;
            
            await this.updateReservationsInTransaction(date, floor, selectedSeats, startMin, endMin, name, course, purposeType, note);
            
            const updatedParams = {
                date, floor,
                seats: selectedSeats,  // [FIX②] number型
                startMin, endMin, name, course, purposeType, note
            };
            
            await logsCollection.doc(this.editingLog.logId).update({
                params: updatedParams,
                summary: { successCount: selectedSeats.length, failCount: 0 },
                updatedAt: new Date()
            });
            
            this.showToast('ログを更新しました', 'success');
            
            this.resetEditMode();
            this.hideAdminPanel();
            
            this.subscribeToReservations();
            
            setTimeout(() => {
                this.loadLogs();
            }, 100);
            
        } catch (error) {
            console.error('Error in one-action update:', error);
            let errorMessage = 'ログの更新に失敗しました';
            if (error.message) errorMessage += `: ${error.message}`;
            this.showToast(errorMessage, 'error');
        }
    }
    
    async updateReservationsInTransaction(date, floor, seats, startMin, endMin, name, course, purposeType, note) {
        try {
            const originalLog = this.editingLog;
            const originalParams = originalLog.params || {};
            const originalDate = originalParams.date;
            const originalFloor = originalParams.floor;
            const originalSeats = (originalParams.seats || []).map(s => Number(s));  // [FIX②] number型に変換
            const originalStartMin = originalParams.startMin;
            const originalEndMin = originalParams.endMin;
            
            const existingSnapshot = await reservationsCollection
                .where('date', '==', originalDate)
                .where('floor', '==', originalFloor)
                .where('startMin', '==', originalStartMin)
                .where('endMin', '==', originalEndMin)
                .get();
            
            // [FIX②] 型を統一してフィルタリング
            const originalSeatsSet = new Set(originalSeats.map(s => Number(s)));
            const filteredDocs = existingSnapshot.docs.filter(doc =>
                originalSeatsSet.has(Number(doc.data().seatNo))
            );
            
            await db.runTransaction(async (transaction) => {
                filteredDocs.forEach(doc => {
                    transaction.delete(doc.ref);
                });
                
                seats.forEach(seatNo => {
                    const reservation = {
                        date,
                        floor,
                        seatNo: Number(seatNo),  // [FIX②] number型で保存
                        startMin,
                        endMin,
                        name,
                        course: course || '',
                        purposeType,
                        note: note || '',
                        batchId: originalLog.batchId,  // [FIX①] 同じbatchIdを引き継ぐ
                        createdAt: new Date(),
                        updatedAt: new Date()
                    };
                    
                    const docRef = reservationsCollection.doc();
                    transaction.set(docRef, reservation);
                });
            });
            
        } catch (error) {
            console.error('Transaction error:', error);
            throw error;
        }
    }

    // [FIX⑥] batchIdで一括削除するメソッド（繰り返し予約の全日付削除に対応）
    async deleteBatch(batchId) {
        if (!batchId) return;
        
        // batchIdで全予約を検索して削除
        const snapshot = await reservationsCollection
            .where('batchId', '==', batchId)
            .get();
        
        if (snapshot.docs.length === 0) {
            console.log('No reservations found with batchId:', batchId);
            return;
        }
        
        // 500件ずつバッチ削除
        const batchSize = 500;
        for (let i = 0; i < snapshot.docs.length; i += batchSize) {
            const batch = db.batch();
            const chunk = snapshot.docs.slice(i, i + batchSize);
            chunk.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        }
        
        console.log(`Deleted ${snapshot.docs.length} reservations with batchId: ${batchId}`);
    }

    async deleteAllReservationsInTimeSlot(date, floor, startMin, endMin) {
        const snapshot = await reservationsCollection
            .where('date', '==', date)
            .where('floor', '==', floor)
            .where('startMin', '==', startMin)
            .where('endMin', '==', endMin)
            .get();
        
        if (snapshot.docs.length === 0) return;
        
        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        await batch.commit();
    }
    
    async createNewReservations(date, floor, seats, startMin, endMin, name, course, purposeType, note) {
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
    }

    // プレビュー機能
    showPreviewModal() {
        this.previewCurrentDate = this.currentDate;
        this.previewCurrentFloor = this.currentFloor;
        
        const previewModal = document.getElementById('previewModal');
        previewModal.style.maxWidth = '100vw';
        previewModal.style.width = 'fit-content';
        previewModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        document.getElementById('previewDate').value = this.previewCurrentDate;
        
        document.querySelectorAll('.preview-floor-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.floor === this.previewCurrentFloor) {
                tab.classList.add('active');
            }
        });
        
        this.generatePreviewTable();
    }

    hidePreviewModal() {
        const modal = document.getElementById('previewModal');
        const modalContent = modal.querySelector('.modal-content');
        modal.classList.remove('active');
        document.body.style.overflow = '';
        
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
        const timeHeaderRow = document.getElementById('timeHeaderRow');
        const tableBody = document.getElementById('previewTableBody');
        
        timeHeaderRow.innerHTML = '<th>席番号</th>';
        for (let hour = 9; hour < 21; hour++) {
            const th = document.createElement('th');
            th.textContent = `${hour}:00~${hour + 1}:00`;
            th.colSpan = 2;
            timeHeaderRow.appendChild(th);
        }
        
        this.loadPreviewData();
    }

    async loadPreviewData() {
        try {
            const snapshot = await reservationsCollection
                .where('date', '==', this.previewCurrentDate)
                .where('floor', '==', this.previewCurrentFloor)
                .get();
            
            const reservations = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            this.renderPreviewTable(reservations);
        } catch (error) {
            console.error('プレビューデータ読み込みエラー:', error);
            this.showToast('プレビューデータの読み込みに失敗しました', 'error');
        }
    }

    renderPreviewTable(reservations) {
        const tableBody = document.getElementById('previewTableBody');
        const maxSeat = this.previewCurrentFloor === '6F' ? 30 : 19;
        
        const SLOT_START = 9 * 60;
        const SLOT_END = 21 * 60;
        const SLOT_SIZE = 30;
        const TOTAL_SLOTS = (SLOT_END - SLOT_START) / SLOT_SIZE;

        tableBody.innerHTML = '';
        for (let seatNo = 1; seatNo <= maxSeat; seatNo++) {
            const row = document.createElement('tr');
            
            const seatCell = document.createElement('td');
            seatCell.textContent = seatNo;
            row.appendChild(seatCell);

            const seatReservations = reservations.filter(r => r.seatNo === seatNo);
            
            let slot = 0;
            while (slot < TOTAL_SLOTS) {
                const slotStartMin = SLOT_START + slot * SLOT_SIZE;
                const slotEndMin = slotStartMin + SLOT_SIZE;

                const reservation = seatReservations.find(r =>
                    r.startMin < slotEndMin && r.endMin > slotStartMin
                );

                if (reservation) {
                    const resStartSlot = Math.ceil((reservation.startMin - SLOT_START) / SLOT_SIZE);
                    
                    if (slot === resStartSlot || (slot < resStartSlot && reservation.startMin < slotEndMin)) {
                        const actualStartSlot = Math.floor((reservation.startMin - SLOT_START) / SLOT_SIZE);
                        const actualEndSlot = Math.ceil((reservation.endMin - SLOT_START) / SLOT_SIZE);
                        const spanSlots = actualEndSlot - actualStartSlot;

                        const mergedCell = document.createElement('td');
                        mergedCell.className = 'reserved-cell';
                        mergedCell.colSpan = spanSlots;

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
                        
                        this.renderReservationInfo(mergedCell, reservation);
                        row.appendChild(mergedCell);
                        
                        slot = actualEndSlot;
                    } else {
                        const emptyCell = document.createElement('td');
                        emptyCell.style.border = '1px solid #ddd';
                        emptyCell.style.backgroundColor = '#f9f9f9';
                        row.appendChild(emptyCell);
                        slot++;
                    }
                } else {
                    const emptyCell = document.createElement('td');
                    emptyCell.style.border = '1px solid #ddd';
                    emptyCell.style.backgroundColor = '#f9f9f9';
                    row.appendChild(emptyCell);
                    slot++;
                }
            }
            
            tableBody.appendChild(row);
        }
    }

    renderReservationInfo(cell, reservation) {
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
        
        if (reservation.course) {
            const courseDiv = document.createElement('div');
            courseDiv.className = 'reservation-course';
            courseDiv.textContent = `(${reservation.course})`;
            courseDiv.style.fontSize = '10px';
            courseDiv.style.marginTop = '1px';
            reservationInfo.appendChild(courseDiv);
        }
        
        if (reservation.purposeType && reservation.purposeType !== '自習') {
            const purposeDiv = document.createElement('div');
            purposeDiv.className = 'reservation-purpose';
            purposeDiv.textContent = reservation.purposeType;
            purposeDiv.style.fontSize = '9px';
            purposeDiv.style.marginTop = '1px';
            reservationInfo.appendChild(purposeDiv);
        }

        if ((reservation.purposeType === '補講' || reservation.purposeType === 'その他') && reservation.note) {
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
            
            await logsCollection.doc(logId).update({
                params: updatedParams,
                summary: updatedSummary,
                updatedAt: new Date()
            });
            
            this.showToast('ログを更新しました', 'success');
            document.getElementById('logEditModal').remove();
            this.loadLogs();
            
        } catch (error) {
            console.error('Error updating log:', error);
            this.showToast('ログの更新に失敗しました', 'error');
        }
    }
    
    async deleteLog(logId) {
        if (!confirm('このログを削除してもよろしいですか？\n関連する予約もすべて削除されます。')) {
            return;
        }
        
        try {
            const logDoc = await logsCollection.doc(logId).get();
            if (logDoc.exists) {
                const logData = logDoc.data();
                
                // [FIX⑥] batchIdがあればbatchIdで全予約を削除（繰り返し予約の全日付対応）
                if (logData.batchId) {
                    await this.deleteBatch(logData.batchId);
                } else {
                    // batchIdがない古いログの場合はフォールバック処理
                    const params = logData.params || {};
                    if (params.date && params.floor && params.seats) {
                        await this.deleteLogRelatedReservations(
                            params.date, params.floor, params.seats,
                            params.startMin, params.endMin
                        );
                    }
                }
            }
            
            await logsCollection.doc(logId).delete();
            
            this.showToast('ログを削除しました', 'success');
            this.loadLogs();
            
        } catch (error) {
            console.error('Error deleting log:', error);
            this.showToast('ログの削除に失敗しました', 'error');
        }
    }
    
    async deleteLogRelatedReservations(date, floor, seats, startMin, endMin) {
        // [FIX②] seatsの型を統一してからSetを作成
        const seatsSet = new Set((seats || []).map(s => Number(s)));
        
        const snapshot = await reservationsCollection
            .where('date', '==', date)
            .where('floor', '==', floor)
            .get();
        
        const targetDocs = snapshot.docs.filter(doc => {
            const d = doc.data();
            if (!seatsSet.has(Number(d.seatNo))) return false;  // [FIX②] number型で比較
            if (startMin !== undefined && endMin !== undefined) {
                return d.startMin === startMin && d.endMin === endMin;
            }
            return true;
        });
        
        const batch = db.batch();
        targetDocs.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        if (targetDocs.length > 0) {
            await batch.commit();
        }
        console.log(`Deleted ${targetDocs.length} related reservations`);
    }
    
    setupModalDrag() {
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
                if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
                    return;
                }
                
                if (e.target === header || header.contains(e.target)) {
                    isDragging = true;
                    startX = e.clientX;
                    startY = e.clientY;
                    
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
                    
                    const minX = -content.offsetWidth + 100;
                    const minY = -content.offsetHeight + 50;
                    const maxX = window.innerWidth - 100;
                    const maxY = window.innerHeight - 50;
                    
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
