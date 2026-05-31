class ScheduleDisplayer {
    constructor(courseSchedule) {
        this.courseSchedule = courseSchedule;
        // Counter for assigning stable IDs to displayed lessons (used to sync UI)
        if (typeof ScheduleDisplayer._lessonIdCounter === 'undefined') {
            ScheduleDisplayer._lessonIdCounter = 0;
        }
        this.dayMap = {
            // Turkish day names
            'Pzt': 'monday',
            'Sal': 'tuesday',
            'Çar': 'wednesday',
            'Per': 'thursday',
            'Cum': 'friday',
            // English day names
            'Monday': 'monday',
            'Tuesday': 'tuesday',
            'Wednesday': 'wednesday',
            'Thursday': 'thursday',
            'Friday': 'friday',
            // English short forms
            'Mon': 'monday',
            'Tue': 'tuesday',
            'Wed': 'wednesday',
            'Thu': 'thursday',
            'Fri': 'friday'
        };
    }

    /**
     * Convert time string (HH:MM) to minutes from midnight
     */
    _timeToMinutes(timeStr) {
        // Delegate to TimeSlotManager utility
        return TimeSlotManager.timeToMinutes(timeStr);
    }

    /**
     * Get the row index for a given time slot
     * Schedule starts at 08:00 with 30-minute intervals
     */
    _getRowIndexForTime(timeStr) {
        // Delegate to TimeSlotManager utility
        return TimeSlotManager.getRowIndexForTime(timeStr);
    }

    /**
     * Calculate how many 30-minute slots a lesson spans
     */
    _calculateSlotSpan(startTime, endTime) {
        // Delegate to TimeSlotManager utility
        return TimeSlotManager.calculateSlotSpan(startTime, endTime);
    }

    /**
     * Get a color for a specific course code
     */
    _getColorForCourse(courseCode) {
        // Delegate to ScheduleStyle utility
        return ScheduleStyle.getColorForCourse(courseCode);
    }

    /**
     * Parse lesson day and time strings into structured data
     * Example: day = "Pzt Çar", time = "09:00/10:00 13:00/14:00"
     */
    _parseLessonSchedule(lessonWithCourse) {
        // Extract the actual lesson object (handle both old and new formats)
        const lesson = lessonWithCourse.lesson || lessonWithCourse;
        
        // Check if lesson has valid day and time
        if (!lesson.day || !lesson.time) {
            console.warn('ScheduleDisplayer: Lesson missing day or time:', lesson);
            return [];
        }
        
        const dayStr = lesson.day.trim();
        const timeStr = lesson.time.trim();
        
        // Skip lessons with no valid day/time (just "-" or empty)
        if (dayStr === '-' || dayStr === '' || timeStr === '-' || timeStr === '') {
            console.log('ScheduleDisplayer: Skipping lesson with invalid day/time:', { day: dayStr, time: timeStr });
            return [];
        }
        
        const days = lesson.day.split(' ').filter(d => d.trim() && d.trim() !== '-');
        const times = lesson.time.split(' ').filter(t => t.trim() && t.trim() !== '-');
        const rooms = lesson.room ? lesson.room.split(' ').filter(r => r.trim()) : [];
        const buildings = lesson.buildings || [];
        
        const schedules = [];
        for (let i = 0; i < days.length; i++) {
            const dayKey = this.dayMap[days[i]];
            if (!dayKey) continue;
            
            const timeRange = times[i].split('/');
            if (timeRange.length !== 2) continue;
            
            const startTime = timeRange[0].trim();
            const endTime = timeRange[1].trim();
            
            // Get the room and building for this specific day (use index, fallback to first or null)
            const roomForDay = rooms[i] || rooms[0] || null;
            const buildingForDay = buildings[i] || buildings[0] || null;
            
            schedules.push({
                day: dayKey,
                startTime: startTime,
                endTime: endTime,
                dayDisplay: days[i],
                lesson: lesson,
                lessonWithCourse: lessonWithCourse,
                room: roomForDay,
                building: buildingForDay
            });
        }
        
        return schedules;
    }

    /**
     * Create a lesson element to display on the schedule
     */
    _createLessonElement(schedule, courseColor, ghostStyle = false) {
        const lessonDiv = document.createElement('div');
        lessonDiv.className = 'schedule-lesson';
        
        // Calculate span for styling
        const span = this._calculateSlotSpan(schedule.startTime, schedule.endTime);
        
        // Calculate height: each slot is 30px + 1px gap
        const height = (span * 31) - 1; // 30px height + 1px gap between cells, minus 1 for the last gap
        
        // Apply base lesson card styles using ScheduleStyle
        ScheduleStyle.applyLessonCardStyles(lessonDiv, courseColor, height, ghostStyle);
        
        // Add 'conflicted-lesson' class if ghost style is applied
        if (ghostStyle) {
            lessonDiv.classList.add('conflicted-lesson');
        }
        
        // Prevent cell selection when clicking on lesson
        lessonDiv.addEventListener('mousedown', (e) => {
            e.stopPropagation();
        });
        
        // Add hover effect
        lessonDiv.addEventListener('mouseenter', () => {
            ScheduleStyle.applyHoverEffect(lessonDiv);
        });
        
        lessonDiv.addEventListener('mouseleave', () => {
            ScheduleStyle.removeHoverEffect(lessonDiv);
        });
        
        // Create pin icon
        const pinIcon = document.createElement('i');
        const lessonCRN = schedule.lesson.crn;
        // Ensure a stable display id on the lesson object so multiple DOM parts
        // for the same lesson can be kept in sync
        const lessonObj = schedule.lesson;
        if (!lessonObj._displayId) {
            ScheduleDisplayer._lessonIdCounter++;
            lessonObj._displayId = `lesson-${ScheduleDisplayer._lessonIdCounter}`;
        }
        lessonDiv.setAttribute('data-lesson-id', lessonObj._displayId);
        // Use display CRN for UI actions; don't mutate canonical lesson.crn here.
        const displayCrn = lessonObj._displayCrn || lessonObj.crn;
        const isPinned = window.pinnedLessons && window.pinnedLessons.has(displayCrn);
        pinIcon.className = isPinned ? 'fa-solid fa-thumbtack lesson-pin-icon pinned' : 'fa-solid fa-thumbtack lesson-pin-icon';
        pinIcon.setAttribute('data-crn', displayCrn);
        
        // Apply pin icon styles using ScheduleStyle
        ScheduleStyle.applyPinIconStyles(pinIcon, isPinned);
        
        pinIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            window.togglePinLesson(displayCrn);
        });
        
        // Create content
        const courseCode = document.createElement('div');
        courseCode.style.fontWeight = 'bold';
        courseCode.style.marginBottom = '4px';
        courseCode.style.paddingRight = '24px'; // Make room for pin icon
        courseCode.style.fontSize = '0.7rem';

        const courseNameTitle = schedule.lessonWithCourse?.courseTitle ||
            schedule.lesson.courseTitle ||
            '';

        const courseCodeTitle = schedule.lessonWithCourse?.courseCode ||
            schedule.lesson.courseCode ||
            'Unknown Course';

        // Get course code from the wrapper object if available, otherwise from lesson
        courseCode.textContent = courseCodeTitle + ": " + courseNameTitle;
        
        const timeInfo = document.createElement('div');
        ScheduleStyle.applyInfoTextStyles(timeInfo, false);
        timeInfo.innerHTML = `<i class="fa-solid fa-clock" style="display: inline-block; width: 20px; margin-right: 6px;"></i>${schedule.startTime} - ${schedule.endTime}`;
        
        const crn = document.createElement('div');
        ScheduleStyle.applyInfoTextStyles(crn);
        // Prepare CRN container; position relative so we can absolutely position the select
        crn.style.position = 'relative';
        crn.style.minHeight = '18px';
        
        if (schedule.lesson.crnList && schedule.lesson.crnList.length > 1) {
            // Create a select dropdown for multiple CRNs
            const crnSelect = document.createElement('select');
            crnSelect.className = 'crn-selector';
            crnSelect.setAttribute('data-lesson-id', lessonObj._displayId);
            // Make the select compact and positioned so it doesn't change layout
            crnSelect.style.width = 'auto';
            crnSelect.style.minWidth = '56px';
            crnSelect.style.border = 'none';
            crnSelect.style.background = 'transparent';
            crnSelect.style.color = 'inherit';
            crnSelect.style.fontSize = 'inherit';
            // Position absolutely so it doesn't consume layout space and shift other texts
            crnSelect.style.position = 'absolute';
            crnSelect.style.right = '6px';
            crnSelect.style.top = '6px';
            crnSelect.style.zIndex = '200';
            crnSelect.style.appearance = 'menulist';
            
            const initialDisplayCrn = lessonObj._displayCrn || lessonObj.crn;
            schedule.lesson.crnList.forEach(crnValue => {
                const option = document.createElement('option');
                option.value = crnValue;
                option.textContent = crnValue;
                if (crnValue === initialDisplayCrn) {
                    option.selected = true;
                }
                crnSelect.appendChild(option);
            });
            
            crnSelect.addEventListener('change', (e) => {
                const newCrn = e.target.value;
                // Update display CRN on the lesson object and any grouped lessons
                lessonObj._displayCrn = newCrn;
                if (Array.isArray(lessonObj._groupedLessons)) {
                    lessonObj._groupedLessons.forEach(l => { l._displayCrn = newCrn; });
                }

                // Sync all selects for this lesson across the grid
                const selector = `select.crn-selector[data-lesson-id="${lessonObj._displayId}"]`;
                const otherSelects = document.querySelectorAll(selector);
                otherSelects.forEach(s => {
                    if (s === e.target) return;
                    if (s.value !== newCrn) s.value = newCrn;
                });

                // Also update any plain CRN displays for the same lesson
                const plainSelector = `.schedule-lesson[data-lesson-id="${lessonObj._displayId}"]`;
                const lessonNodes = document.querySelectorAll(plainSelector);
                lessonNodes.forEach(node => {
                    const spans = node.querySelectorAll('.crn-text');
                    spans.forEach(sp => { sp.textContent = newCrn; });
                });

                // Update pin icon state for all lesson elements for this lesson
                const pinSelector = `.schedule-lesson[data-lesson-id="${lessonObj._displayId}"] .lesson-pin-icon`;
                const pins = document.querySelectorAll(pinSelector);
                pins.forEach(p => {
                    p.setAttribute('data-crn', newCrn);
                    if (window.pinnedLessons && window.pinnedLessons.has(newCrn)) {
                        p.classList.add('pinned');
                    } else {
                        p.classList.remove('pinned');
                    }
                });

                // Update the display (repaint if necessary)
                if (typeof this._updateScheduleDisplay === 'function') this._updateScheduleDisplay();
            });
            
            // Allow dropdown to overflow short lesson cards
            // (ScheduleStyle.applyLessonCardStyles sets overflow hidden by default)
            // Set lessonDiv to allow visible overflow so the native select popup is visible
            lessonDiv.style.overflow = 'visible';

            crn.innerHTML = `<i class="fa-solid fa-hashtag" style="display: inline-block; width: 20px; margin-right: 6px;"></i>`;
            crn.appendChild(crnSelect);
        } else {
            const displayCrnPlain = lessonObj._displayCrn || lessonObj.crn || 'N/A';
            crn.innerHTML = `<i class="fa-solid fa-hashtag" style="display: inline-block; width: 20px; margin-right: 6px;"></i><span class="crn-text">${displayCrnPlain}</span>`;
        }
        
        const instructor = document.createElement('div');
        ScheduleStyle.applyInfoTextStyles(instructor);
        ScheduleStyle.applyTextEllipsis(instructor);
        const instructorName = schedule.lesson.instructor === '-' ? 'Bilinmiyor (-)' : (schedule.lesson.instructor || 'TBA');
        instructor.innerHTML = `<i class="fa-solid fa-user" style="display: inline-block; width: 20px; margin-right: 6px;"></i>${instructorName}`;
        
        // Check if lesson is online
        const teachingMethod = (schedule.lesson.teachingMethod || '').toLowerCase();
        const isOnline = teachingMethod.includes('online');
        
        // Create online element (shown instead of building/campus/room for online lessons)
        const onlineElement = document.createElement('div');
        ScheduleStyle.applyInfoTextStyles(onlineElement);
        if (isOnline) {
            onlineElement.innerHTML = `<i class="fa-solid fa-globe" style="display: inline-block; width: 20px; margin-right: 6px;"></i>Online`;
        }
        
        // Create building element
        const building = document.createElement('div');
        ScheduleStyle.applyInfoTextStyles(building);
        ScheduleStyle.applyTextEllipsis(building);
        if (!isOnline && schedule.building) {
            if (schedule.building.code || schedule.building.name) {
                const bina = [schedule.building.code, schedule.building.name]
                    .filter(Boolean)
                    .join(' (') + (schedule.building.name ? ')' : '');
                building.innerHTML = `<i class="fa-solid fa-house" style="display: inline-block; width: 20px; margin-right: 6px;"></i>${bina}`;
            }
        }
        
        // Create campus element
        const campus = document.createElement('div');
        ScheduleStyle.applyInfoTextStyles(campus);
        ScheduleStyle.applyTextEllipsis(campus);
        if (!isOnline && schedule.building && schedule.building.campus_name) {
            campus.innerHTML = `<i class="fa-solid fa-building-columns" style="display: inline-block; width: 20px; margin-right: 6px;"></i>${schedule.building.campus_name}`;
        }
        
        // Create room element
        const room = document.createElement('div');
        ScheduleStyle.applyInfoTextStyles(room);
        ScheduleStyle.applyTextEllipsis(room);
        if (!isOnline && schedule.room) {
            room.innerHTML = `<i class="fa-solid fa-door-closed" style="display: inline-block; width: 20px; margin-right: 6px;"></i>${schedule.room}`;
        }
        
        lessonDiv.appendChild(pinIcon);
        lessonDiv.appendChild(courseCode);
        lessonDiv.appendChild(timeInfo);
        lessonDiv.appendChild(crn);
        lessonDiv.appendChild(instructor);
        if (isOnline) {
            lessonDiv.appendChild(onlineElement);
        }
        if (building.textContent) {
            lessonDiv.appendChild(building);
        }
        if (campus.textContent) {
            lessonDiv.appendChild(campus);
        }
        if (room.textContent) {
            lessonDiv.appendChild(room);
        }
        
        // Add fade-out overlay
        const fadeOverlay = document.createElement('div');
        fadeOverlay.className = 'lesson-fade-overlay';
        const bgColor = courseColor || '#000';
        fadeOverlay.style.background = `linear-gradient(to bottom, transparent 0%, ${bgColor} 100%)`;
        lessonDiv.appendChild(fadeOverlay);
        
        // Add tooltip with full course information
        const buildingInfo = [];
        if (isOnline) {
            buildingInfo.push('Online');
        } else {
            if (schedule.building) {
                if (schedule.building.code || schedule.building.name) {
                    const bina = [schedule.building.code, schedule.building.name]
                        .filter(Boolean)
                        .join(' (') + (schedule.building.name ? ')' : '');
                    buildingInfo.push(`Bina: ${bina}`);
                }
                if (schedule.building.campus_name) {
                    buildingInfo.push(`Kampüs: ${schedule.building.campus_name}`);
                }
            }
            if (schedule.room) {
                buildingInfo.push(`Sınıf: ${schedule.room}`);
            }
        }
        
        const tooltipText = [
            `${courseCodeTitle}: ${courseNameTitle}`,
            `${schedule.startTime} - ${schedule.endTime}`,
            `CRN: ${lessonObj._displayCrn || lessonObj.crn || 'N/A'}`,
            `Öğretim Görevlisi: ${instructorName}`,
            ...buildingInfo
        ].filter(Boolean).join('\n');
        
        lessonDiv.setAttribute('title', tooltipText);
        
        return lessonDiv;
    }

    /**
     * Clear all lessons from the schedule display
     */
    clear() {
        const scheduleCells = document.querySelectorAll('.schedule-cell');
        scheduleCells.forEach(cell => {
            // Remove any lesson elements
            const lessons = cell.querySelectorAll('.schedule-lesson');
            lessons.forEach(lesson => lesson.remove());
        });
    }

    /**
     * Show the "no valid plans" message popup
     */
    showNoPlansMessage() {
        const popup = document.getElementById('no-plans-popup');
        if (popup) {
            popup.style.display = 'block';
            
            // Add event listener to close button
            const closeBtn = document.getElementById('no-plans-close-btn');
            if (closeBtn) {
                closeBtn.onclick = () => this.hideNoPlansMessage();
            }
        }
    }

    /**
     * Hide the "no valid plans" message popup
     */
    hideNoPlansMessage() {
        const popup = document.getElementById('no-plans-popup');
        if (popup) {
            popup.style.display = 'none';
        }
    }

    /**
     * Display the course schedule on the grid
     */
    display(useGhostStyle = false) {
        // Hide the no plans message when displaying a schedule
        this.hideNoPlansMessage();
        
        // Clear existing lessons
        this.clear();
        
        if (!this.courseSchedule || !this.courseSchedule.lessons) {
            console.warn('No course schedule to display');
            return;
        }
        
        // Process each lesson
        this.courseSchedule.lessons.forEach((lessonWithCourse, index) => {
            // Debug logging for lesson structure
            if (!lessonWithCourse) {
                console.warn(`Lesson at index ${index} is null or undefined`);
                return;
            }
            
            // Get courseCode from the wrapper object
            const courseCode = lessonWithCourse.courseCode || 
                              lessonWithCourse.lesson?.courseCode;
            
            if (!courseCode) {
                console.warn(`Lesson at index ${index} missing courseCode:`, lessonWithCourse);
            }
            
            const schedules = this._parseLessonSchedule(lessonWithCourse);
            const courseColor = this._getColorForCourse(courseCode);
            
            schedules.forEach((schedule, schedIndex) => {
                // Find the starting cell for this lesson
                const rowIndex = this._getRowIndexForTime(schedule.startTime);
                const cellSelector = `.schedule-cell[data-day="${schedule.day}"][data-time="${schedule.startTime}"]`;
                const targetCell = document.querySelector(cellSelector);
                
                if (!targetCell) {
                    console.warn(`Could not find cell for ${schedule.day} at ${schedule.startTime}`, schedule);
                    return;
                }
                
                // Create and append the lesson element
                const lessonElement = this._createLessonElement(schedule, courseColor, useGhostStyle);
                targetCell.appendChild(lessonElement);
            });
        });
    }

    /**
     * Update the displayed schedule with a new CourseSchedule
     */
    update(courseSchedule) {
        this.courseSchedule = courseSchedule;
        this.display();
    }
}
