let colorPicker = document.getElementById('colorPicker');
let colorKnob = document.getElementById('colorKnob');
let elements = document.querySelectorAll('#elementsContainer .element');
let outputHTMLContainer = document.getElementById('html');
let outputCSSContainer = document.getElementById('css');
let previewContainer = document.getElementById('previewContainer');
let settings = document.getElementById('settings');
let structureContainer = document.getElementById('structureContainer');
let currentDistance = null;
let draggingElement = null;
let editing = null;
let nearestField = null;
let rowSelect = null;
let setCurrentDistance = true;
let setOnce = false;
let structureItem = null;
const cssVariables = ['width', 'height', 'margin', 'padding', 'background-color', 'color', 'font-size', 'font-family', 'font-weight', 'font-style', 'text-decoration',];
const orientations = ['layout-vertical', 'layout-horizontal', 'layout-grid',
                      'horizontal-start','horizontal-center', 'horizontal-end',
                      'vertical-start',  'vertical-center',   'vertical-end'
];

document.onclick = function(event) {
    if (!settings.contains(event.target)) {
        let lastEdited = structureContainer.parentElement.querySelector('.editing');
        if (lastEdited) {
            lastEdited.classList.remove('editing');
            document.body.appendChild(colorPicker.parentElement);
            colorPicker.parentElement.style.display = 'none';
        }
        if (structureContainer.contains(event.target) && event.target != lastEdited) {
            event.target.classList.add('editing');
            showSettings(event.target);
        }
    }
}
document.onkeydown = function(event) {
    setCurrentDistance = false;
}
document.onkeyup = function(event) {
    setOnce = true;
    if (event.key == 'Control') {
        if (setOnce) {
            setCurrentDistance = true;
            setOnce = false;
        }
    }
}
elements.forEach(element => {
    element.draggable='true';
    Array.from(element.children).forEach(function(child) {
        child.style.pointerEvents = 'none';
        child.style.zIndex = '0';
    });
    element.setAttribute('ondragstart', 'dragStart(event)');
    element.setAttribute('ondragend', 'dragEnd(); dragReset(event); refreshPreview();');
    element.setAttribute('ondragover', 'allowDrop(event)');
    element.setAttribute('ondrop', 'drop(event)');
    Array.from(element.attributes).forEach(function(attr) {
        if (attr.name.startsWith('data-')) {
            element.style.setProperty(`--${attr.name.replace('data-', '')}`, attr.value);
        }
    });
});

//#region Color picker
class ColorPicker {
    constructor(width = 200, height = 200, colorPickerId, colorKnobId) {
        this.width = width;
        this.height = height;
        this.colorPicker = document.getElementById(colorPickerId);
        this.colorKnob = document.getElementById(colorKnobId);
        this.ctx = this.colorPicker.getContext('2d');
        this.centerX = 0;
        this.centerY = 0;
        this.radius = 0;
        this.currentX = 0;
        this.currentY = 0;
        this.currentDistance = null;
        this.isDragging = false;
        this.name = null;

        this.initialize();
    }

    initialize() {
        this.colorPicker.width = this.width;
        this.colorPicker.height = this.height;
        this.colorPicker.parentElement.style.width = `${this.width}px`;
        this.colorPicker.parentElement.style.height = `${this.height}px`;
        this.colorKnob.style.width = `${this.width / 4}px`;
        this.colorKnob.style.height = `${this.height / 4}px`;

        this.updateGeometry();
        this.drawColorWheel();

        this.colorKnob.addEventListener('pointerdown', () => this.isDragging = true, { passive: true });
        this.colorPicker.addEventListener('pointerdown', () => this.isDragging = true, { passive: true });
        document.addEventListener('pointermove', (e) => {
            if (this.isDragging) {
                this.handleKnobPosition(e);
            }
        }, { passive: true });
        document.addEventListener('pointerup', () => this.isDragging = false, { passive: true });
        this.colorPicker.addEventListener('click', (e) => {
            if (e.target !== this.colorKnob) {
                this.handleKnobPosition(e);
            }
        }, { passive: true });

        // Add fallback for pointer events
        if (!window.PointerEvent) {
            this.colorKnob.addEventListener('mousedown', () => this.isDragging = true);
            this.colorKnob.addEventListener('touchstart', (e) => {
                this.isDragging = true;
                e.preventDefault();
            });
            
            document.addEventListener('mousemove', this.handleMove.bind(this));
            document.addEventListener('touchmove', this.handleMove.bind(this));
            
            document.addEventListener('mouseup', () => this.isDragging = false);
            document.addEventListener('touchend', () => this.isDragging = false);
        }

        this.updateColor(this.currentX, this.currentY);
        this.colorPicker.parentElement.style.display = 'none';
    }

    updateGeometry() {
        let rect = this.colorPicker.getBoundingClientRect();
        this.centerX = rect.width / 2;
        this.centerY = rect.height / 2;
        this.radius = Math.min(this.centerX, this.centerY);
    }

    drawColorWheel() {
        for (let angle = 0; angle < 360; angle++) {
            let startAngle = (angle - 2) * Math.PI / 180;
            let endAngle = angle * Math.PI / 180;

            this.ctx.beginPath();
            this.ctx.moveTo(this.centerX, this.centerY);
            this.ctx.arc(this.centerX, this.centerY, this.radius - 1, startAngle, endAngle);
            this.ctx.closePath();

            let hue = angle;
            this.ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
            this.ctx.fill();
        }

        const radialGradient = this.ctx.createRadialGradient(this.centerX, this.centerY, 0, this.centerX, this.centerY, this.radius);
        radialGradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
        radialGradient.addColorStop(0.3, 'rgba(255, 255, 255, 1)');
        radialGradient.addColorStop(0.35, 'rgba(255, 255, 255, 1)');
        radialGradient.addColorStop(0.6, 'rgba(255, 255, 255, 0)');
        radialGradient.addColorStop(0.8, 'rgba(128, 128, 128, 0)');
        radialGradient.addColorStop(0.95, 'rgba(0, 0, 0, 1)');
        radialGradient.addColorStop(1, 'rgba(0, 0, 0, 1)');

        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, this.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = radialGradient;
        this.ctx.fill();

        this.currentX = this.centerX;
        this.currentY = this.centerY;

        this.colorKnob.style.left = this.currentX + 'px';
        this.colorKnob.style.top = this.currentY + 'px';
    }

    updateColor(x, y) {
        let pixel = this.ctx.getImageData(x, y, 1, 1).data;
        let colorRGB = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
        let colorHex = this.rgbToHex(pixel[0], pixel[1], pixel[2]);
        this.colorKnob.style.backgroundColor = colorRGB;
        this.name = this.colorPicker.parentElement.parentElement.getAttribute('name');
        if (this.name) this.colorKnob.dataset[this.name] = colorHex;
        this.colorKnob.dataset.name = this.name;
        this.colorKnob.dataset.cssColor = colorHex;

        if (editing) {
            let beforePos = editing.dataset.colorKnobPos || '{}';
            let positions = JSON.parse(beforePos);
            this.colorKnob.getAttributeNames().forEach(function(attr) {
                if (attr.startsWith('data-') && attr.includes('color')) {
                    positions[this.name] = [x, y];
                }
            }.bind(this))
            editing.dataset.colorKnobPos = JSON.stringify(positions);
        }
        changeProperty(this.colorKnob);
    }

    handleKnobPosition(e) {
        this.updateGeometry(); // Recalculate geometry dynamically
        let x = e.clientX - this.colorPicker.getBoundingClientRect().left;
        let y = e.clientY - this.colorPicker.getBoundingClientRect().top;

        let dx = x - this.centerX;
        let dy = y - this.centerY;
        let distance = Math.sqrt(dx * dx + dy * dy);
        let angle = Math.atan2(dy, dx);
        if (setCurrentDistance) {
            this.currentDistance = distance;
        }
        let constrainedDistance = Math.min(this.currentDistance ? this.currentDistance : distance, this.radius - 2);

        this.currentX = this.centerX + constrainedDistance * Math.cos(angle);
        this.currentY = this.centerY + constrainedDistance * Math.sin(angle);

        requestAnimationFrame(this.updateUI.bind(this));
    }

    updateUI() {
        this.colorKnob.style.left = this.currentX + 'px';
        this.colorKnob.style.top = this.currentY + 'px';
        this.updateColor(this.currentX, this.currentY);
    }

    handleMove(e) {
        if (this.isDragging) {
            let touch = e;
            if (e.touches) {
                touch = e.touches[0];
            }
            let x = touch.clientX - this.colorPicker.getBoundingClientRect().left;
            let y = touch.clientY - this.colorPicker.getBoundingClientRect().top;
            this.updateColor(x, y);
        }
    }

    rgbToHex(r, g, b) {
        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
    }

    setKnobPosition(x, y) {
        this.updateGeometry();
        this.currentX = x;
        this.currentY = y;
        this.updateUI();
    }

    setParent(parent) {
        parent.appendChild(this.colorPicker.parentElement);
        this.colorPicker.parentElement.style.display = 'block';
        this.name = this.colorPicker.parentElement.parentElement.getAttribute('name');
        let knobPos = editing.dataset.colorKnobPos;
        if (knobPos) {
            knobPos = JSON.parse(knobPos);
            if (knobPos[this.name]) {
                this.setKnobPosition(knobPos[this.name][0], knobPos[this.name][1]);
                return;
            }
        }
        this.setKnobPosition(this.centerX, this.centerY);
    }
}

let colorPickerInstance = new ColorPicker(150, 150, 'colorPicker', 'colorKnob');
//createColorPicker(150, 150);
//#endregion





// #region Dragging
function dragStart(event) {
    event.target.style.opacity = '0.5';
    if (event.target.classList.contains('structure-item')) {
        event.target.id = 'dragging';
        event.target.classList.remove('editing');
        document.body.appendChild(event.target);
        event.target.style.display = 'none';
    }
    event.dataTransfer.setData('id', event.target.id);
}
function addIndicators() {
    structureContainer.querySelectorAll('.structure-item').forEach(function(el) {
        el.insertAdjacentHTML('beforebegin', '<div class="field"></div>');
        if (el.getAttribute('data-name').toLowerCase() == 'container') {
            el.insertAdjacentHTML('beforeend', '<div class="field"></div>');
        }
    });
    structureContainer.insertAdjacentHTML('beforeend', '<div class="field"></div>');
}
function allowDrop(event) {
    if (event.target.parentElement.id == 'elementsContainer' || event.target.parentElement.parentElement.id == 'elementsContainer') {
        return;
    }
    draggingElement = document.getElementById(event.dataTransfer.getData('id'));
    event.preventDefault();
    if (!document.querySelector('.field') && draggingElement != event.target) {
        addIndicators();
    }
    var nearestDistance = Infinity;
    document.querySelectorAll('.field').forEach(function(el){
        var rect = el.getBoundingClientRect();
        var halfHeight = { x: rect.width / 2, y: rect.height / 2 };
        var distance = Math.abs(event.clientX - (rect.left + halfHeight.x)) + Math.abs(event.clientY - (rect.top + halfHeight.y));
        if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestField = el;
        }
        el.style.outlineColor = '#ffdc9c';
    });
    if (nearestField) {
        nearestField.style.outlineColor = '#ffa600';
    }
}
function drop(event) {
    event.preventDefault();
    if (draggingElement) {
        if (draggingElement.classList.contains('structure-item')) {
            draggingElement = document.getElementById('dragging');
        }
        structureItem = draggingElement.cloneNode(true);
        structureItem.style.removeProperty('display');
        structureItem.style.opacity = '1';
        structureItem.classList.add('structure-item');
        if (['container', 'spacing'].includes(structureItem.getAttribute('data-name').toLowerCase())) {
            structureItem.childNodes.forEach(function(node) {
                if (node.nodeName == '#text') node.remove();
            });
        }
        var dataset = draggingElement.dataset;
        for (var key in dataset) {
            var value = dataset[key]
            if (value != undefined) {
                //console.log(`    Key: ${key}, Value: ${dataset[key]}`);
                structureItem.dataset[key] = value;
                if (cssVariables.includes(key) && !structureItem.getAttribute(`data-${key}`)) {
                    structureItem.style.setProperty(`--${key}`, value);
                }
            }
        }
        structureItem.id = '';
    }
}
function dragEnd() {
    if (structureItem) {
        if (nearestField) {
            nearestField.insertAdjacentElement('afterend', structureItem);
        } else {
            structureContainer.appendChild(structureItem);
        }
        if (draggingElement.classList.contains('structure-item')) {
            draggingElement.remove();
        }
    }
}
function dragReset(event) {
    event.preventDefault();
    document.querySelectorAll('.field').forEach(el => el.remove());
    event.target.style.opacity = '1';
}
// #endregion





// #region Settings
function showSettings(ele) {
    editing = ele;
    settings.innerHTML = /*html*/`
        <div class="flex nowrap">
            <button id="remove" onclick="removeElement()"><img src="/graphics/remove.svg" /></button>
            <h2>Editing "${ele.dataset.name}"</h2>
        </div>
        <details>
            <summary>Dimensions</summary>
            <div class="flex">
                <div id="dimensions">
                    <input size="1" name="width" value="${ele.dataset.width ? ele.dataset.width : 'auto'}" oninput="this.size = this.value.length == 0 ? 1 : this.value.length; changeProperty(this);">
                    <span>Width</span>
                    <input size="1" name="height" value="${ele.dataset.height ? ele.dataset.height : 'auto'}" oninput="this.size = this.value.length == 0 ? 1 : this.value.length; changeProperty(this);">
                    <span>Height</span>
                    <input size="1" name="padding" value="${ele.dataset.padding ? ele.dataset.padding : '0'}" oninput="this.size = this.value.length == 0 ? 1 : this.value.length; changeProperty(this);">
                    <span>Padding</span>
                    <input size="1" name="margin" value="${ele.dataset.margin ? ele.dataset.margin : '0'}" oninput="this.size = this.value.length == 0 ? 1 : this.value.length; changeProperty(this);">
                    <span>Margin</span>
                </div>
                <div>
                    <label>Minimal width</label>
                    <input size="1" name="minWidth" value="${ele.dataset.minWidth ? ele.dataset.minWidth : 'auto'}" oninput="this.size = this.value.length == 0 ? 1 : this.value.length; changeProperty(this);">
                    <br>
                    <label>Maximal width</label>
                    <input size="1" name="maxWidth" value="${ele.dataset.maxWidth ? ele.dataset.maxWidth : 'auto'}" oninput="this.size = this.value.length == 0 ? 1 : this.value.length; changeProperty(this);">
                </div>
                <div>
                    <label>Minimal height</label>
                    <input size="1" name="minHeight" value="${ele.dataset.minHeight ? ele.dataset.minHeight : 'auto'}" oninput="this.size = this.value.length == 0 ? 1 : this.value.length; changeProperty(this);">
                    <br>
                    <label>Maximal height</label>
                    <input size="1" name="maxHeight" value="${ele.dataset.maxHeight ? ele.dataset.maxHeight : 'auto'}" oninput="this.size = this.value.length == 0 ? 1 : this.value.length; changeProperty(this);">
                </div>
            </div>
        </details>
        <div class="grid layout" style="--display: inline-grid; --gap: 0.5em; --rows: 2;">
            <label>Layout</label>
            <div class="multi-switch" style="--display: inline-flex;">
                <div class="flex" style="--direction: column;">
                    <input type="radio" name="layout" value="layout-vertical" class="last-checked" onchange="changeLayout(this)"
                    ${ele.classList.contains('layout-vertical') ? 'checked' : ''}>
                    <div></div><div></div><div></div>
                </div>
                <div class="flex">
                    <input type="radio" name="layout" value="layout-horizontal" onchange="changeLayout(this)"
                    ${ele.classList.contains('layout-horizontal') ? 'checked' : ''}>
                    <div></div><div></div><div></div>
                </div>
                <div class="grid">
                    <input type="radio" name="layout" value="layout-grid" onchange="changeLayout(this)"
                    ${ele.classList.contains('layout-grid') ? 'checked' : ''}>
                    <input type="number" size="1" value="${ele.dataset.rows ? ele.dataset.rows : '2'}" oninput="this.size = this.value.length == 0 ? 1 : this.value.length; changeRows(this.value);">
                    <input type="number" size="1" value="${ele.dataset.cols ? ele.dataset.cols : '2'}" oninput="this.size = this.value.length == 0 ? 1 : this.value.length; changeCols(this.value);">
                </div>
            </div>
            <label class="orientation">Orientation</label>
            <div class="multi-switch orientation" style="--display: inline-flex;">
                <div class="flex">
                    <input type="radio" name="orientation-h" value="horizontal-start" class="last-checked" onchange="changeLayout(this)"
                    ${ele.classList.contains('horizontal-start') ? 'checked' : ''}>
                    <div></div><div></div>
                </div>
                <div class="flex">
                    <input type="radio" name="orientation-h" value="horizontal-center" onchange="changeLayout(this)"
                    ${ele.classList.contains('horizontal-center') ? 'checked' : ''}>
                    <div></div><div></div>
                </div>
                <div class="flex">
                    <input type="radio" name="orientation-h" value="horizontal-end" onchange="changeLayout(this)"
                    ${ele.classList.contains('horizontal-end') ? 'checked' : ''}>
                    <div></div><div></div>
                </div>
                <div class="flex" style="--direction: column;">
                    <input type="radio" name="orientation-v" value="vertical-start" class="last-checked" onchange="changeLayout(this)"
                    ${ele.classList.contains('vertical-start') ? 'checked' : ''}>
                    <div></div><div></div>
                </div>
                <div class="flex" style="--direction: column;">
                    <input type="radio" name="orientation-v" value="vertical-center" onchange="changeLayout(this)"
                    ${ele.classList.contains('vertical-center') ? 'checked' : ''}>
                    <div></div><div></div>
                </div>
                <div class="flex" style="--direction: column;">
                    <input type="radio" name="orientation-v" value="vertical-end" onchange="changeLayout(this)"
                    ${ele.classList.contains('vertical-end') ? 'checked' : ''}>
                    <div></div><div></div>
                </div>
            </div>
        </div>
        <!--<label for="type" class="type">Viewing Type</label>
        <select name="type" class="type" onchange="changeType(this.value)">
            <option value="text" ${ele.dataset.type == 'text' ? 'selected' : ''}>Text</option>
            <option value="image" ${ele.dataset.type == 'image' ? 'selected' : ''}>Image</option>
        </select>
        <label class="type">Empty Text</label>
        <input class="type" size="1" value="${ele.dataset.empty != undefined ? ele.dataset.empty : 'no data'}" oninput="this.size = this.value.length == 0 ? 1 : this.value.length; changeEmpty(this.value);">-->
        <div class="text grid" style="--display: inline-grid; --gap: 0.5em; --rows: 2;">
            <label>Font family</label>
            <select onchange="changeProperty(this)">
                <option value="fontFamily" ${ele.dataset.fontFamily == 'Sans-Serif' ? 'selected' : ''}>Sans-Serif</option>
                <option value="fontFamily" ${ele.dataset.fontFamily == 'Serif' ? 'selected' : ''}>Serif</option>
                <option value="fontFamily" ${ele.dataset.fontFamily == 'Monospace' ? 'selected' : ''}>Monospace</option>
                <option value="fontFamily" ${ele.dataset.fontFamily == 'Cursive' ? 'selected' : ''}>Cursive</option>
            </select>
            <label>Font size</label>
            <input size="1" name="fontSize" value="${ele.dataset.fontSize ? ele.dataset.fontSize : '1em'}" oninput="this.size = this.value.length == 0 ? 1 : this.value.length; changeProperty(this);">
            <label>Font style</label>
            <div class="flex" style="--display: inline-flex; --gap: 0.5em;">
                <div class="togglebutton"><input type="checkbox" onclick="changeProperty(this)" name="fontWeight" value="bold" ${ele.dataset.fontWeight == 'bold' ? 'checked' : ''} /><b>B</b></div>
                <div class="togglebutton"><input type="checkbox" onclick="changeProperty(this)" name="fontStyle" value="italic" ${ele.dataset.fontStyle == 'italic' ? 'checked' : ''} /><i>I</i></div>
                <div class="togglebutton"><input type="checkbox" onclick="changeProperty(this)" name="textDecoration" value="underline" ${ele.dataset.textDecoration == 'underline' ? 'checked' : ''} /><u>U</u></div>
                <div class="togglebutton"><input type="checkbox" onclick="changeProperty(this)" name="textDecoration" value="line-through" ${ele.dataset.textDecoration == 'line-through' ? 'checked' : ''} /><s>S</s></div>
            </div>
            <label>Text</label>
            <input size="1" value="${ele.innerText}" oninput="this.size = this.value.length == 0 ? 1 : this.value.length; changeText(this.value != '' ? this.value : 'no text');">
        </div>
        <label class="image svg center-vertical" style="--display: flex;">
            SVG<span class="switch">
                <input type="checkbox" onclick="if (this.checked) { editing.dataset.name = 'Image' } else { editing.dataset.name = 'SVG' } refreshPreview()" ${ele.dataset.name == 'Image' ? 'checked' : ''} />
            </span>Image
        </label>
        <label class="image">Image URL</label>
        <input class="image" size="1" value="${ele.querySelector('img') ? ele.querySelector('img').src : ''}" oninput="this.size = this.value.length == 0 ? 1 : this.value.length; changeImage(this.value);">
        <label class="svg">SVG Code</label>
        <pre class="svg"
             contenteditable="true"
             spellcheck="false"
             oninput="changeSVG(this, this.innerText != '' ? this.innerText : '<svg></svg>'); //restoreSelection(this);"
             onkeydown="//saveSelection(this)"></pre>
        <div class="grid" style="--display: inline-grid; --gap: 0.5em; --rows: 2;">
            <label>Background color</label>
            <div name="backgroundColor" onmouseenter="colorPickerInstance.setParent(this)">
                <span class="nothing">Select color</span>
            </div>
            <label>Text color</label>
            <div name="color" onmouseenter="colorPickerInstance.setParent(this)">
                <span class="nothing">Select color</span>
            </div>
        </div>
    `;
    formatXML(document.querySelector('#settings pre'), ele.querySelector('svg') ? ele.querySelector('svg').outerHTML : '<svg></svg>');

    document.querySelectorAll('#settings input').forEach(el => el.size = el.value.length == 0 ? 1 : el.value.length);
    let grid = document.querySelector('#settings div:has(> [value="layout-grid"])');
    if (!grid.style.getPropertyValue('--rows')) {
        grid.style.setProperty('--rows', ele.dataset.rows || 2);
    }
    if (!grid.style.getPropertyValue('--cols')) {
        grid.style.setProperty('--cols', ele.dataset.cols || 2);
    }
    grid.insertAdjacentHTML('beforeend', '<div></div>'.repeat(grid.style.getPropertyValue('--rows') * grid.style.getPropertyValue('--cols')))
}
function changeProperty(self) {
    if (editing == null) return;
    var property;
    var value;
    if (self.tagName == 'SELECT') {
        [...self.options].map(o => o.value).forEach(function(option) {
            editing.style.removeProperty(`--${convertToDashStyle(option)}`);
        });
        property = self.value;
        value = self.options[self.selectedIndex].text;
    /*} else if (self == colorKnob) {
        property = 'color';
        value = self.dataset.color;*/
    } else {
        property = self.name || self.dataset.name;
        value = self.value || self.dataset[property];
    }
    editing.dataset[property] = value;
    //console.log(`    Key: ${property}, Value: ${self.value}`);
    //editing.style.setProperty(property, self.value ? self.value : 'none');
    editing.style.setProperty(`--${convertToDashStyle(property)}`, value ? value : 'none');
    if (value == 0 || self.type == 'checkbox' && self.checked == false) {
        editing.style.removeProperty(`--${convertToDashStyle(property)}`);
        //editing.style.removeProperty(property);
    }
    let checkedTextDecoration = settings.querySelectorAll('.togglebutton input[name="textDecoration"]:checked');
    if (checkedTextDecoration && checkedTextDecoration.length > 1) {
        checkedTextDecoration.forEach(function(el) {
            if (el.value != value) {
                el.checked = false;
            }
        })
    }
    refreshPreview();
}
function changeEmpty(empty) {
    editing.dataset.empty = empty;
    refreshPreview();
}
function changeName(name) {
    editing.dataset.name = name;
    refreshPreview();
}
function changeText(text) {
    editing.innerText = text;
    refreshPreview();
}
function changeImage(src) {
    editing.querySelector('img').src = src;
    refreshPreview();
}
function changeSVG(self, svg) {
    if (editing.querySelector('svg')) editing.querySelector('svg').remove();
    
    let reformat = !checkIndentation(svg, 2);

    // Replace stroke and fill colors with currentColor, except "none", white and black
    /* svg = svg.replace(/stroke="(#(?:FFFFFF|ffffff|000000|FFF|fff|000)|white|black|(?!none"))"/g, 'stroke="currentColor"')
             .replace(/fill="(#(?:FFFFFF|ffffff|000000|FFF|fff|000)|white|black|(?!none"))"/g, 'fill="currentColor"'); */

    if (/stroke="(#(?:FFFFFF|ffffff|000000|FFF|fff|000)|white|black|(?!none"))"/g.test(svg)) {
        svg = svg.replace(/stroke="(#(?:FFFFFF|ffffff|000000|FFF|fff|000)|white|black|(?!none"))"/g, 'stroke="currentColor"');
        reformat = true;
    }
    if (/fill="(#(?:FFFFFF|ffffff|000000|FFF|fff|000)|white|black|(?!none"))"/g.test(svg)) {
        svg = svg.replace(/fill="(#(?:FFFFFF|ffffff|000000|FFF|fff|000)|white|black|(?!none"))"/g, 'fill="currentColor"');
        reformat = true;
    }

    //console.log(`SVG: ${svg}`);
    //console.log(`Reformat SVG: ${reformat}`);

    if (reformat) {
        formatXML(self, svg);
    }
    editing.insertAdjacentHTML('beforeend', svg);
    Array.from(editing.children).forEach(function(child) {
        child.style.pointerEvents = 'none';
        child.style.zIndex = '0';
    });
    refreshPreview();
}
function formatXML(container, svgText) {
    // Entferne überflüssige Leerzeichen und neue Zeilen
    svgText = svgText.trim();

    // Füge Einzüge und neue Zeilen hinzu
    const formattedSVG = svgText.replace(/(<[^>]+>)/g, '\n$1');

    // Füge Einzüge für verschachtelte Elemente hinzu
    const lines = formattedSVG.split('\n');
    let indentLevel = 0;
    const indentedLines = [];

    for (const line of lines) {
        const trimmedLine = line.trim(); // Entferne führende und nachfolgende Leerzeichen
        if (trimmedLine === '') {
            continue; // Überspringe leere Zeilen
        }
        var indent = '';
        if (trimmedLine.match(/<[^\/]/)) {
            indent = '  '.repeat(indentLevel);
            indentLevel++;
        } else if (trimmedLine.match(/<\//)) {
            indentLevel--;
            indent = '  '.repeat(indentLevel);
        } else {
            indent = '  '.repeat(indentLevel);
        }
        indentedLines.push(indent + trimmedLine);
    }

    let xml = indentedLines.join('\n');
    /* let xmlSplit = xml.replace(/<(\w+)/g, '<|[$1°tag]|') // Add "[" before and "]" after the opening tag name and add "°" for color attribute
                      .replace(/<\/(\w+)/g, '</|[$1°tag]|') // Add "[" before and "]" after the closing tag name and add "°" for color attribute
                      .replace(/(\S+)=/g, '|[$1°attr]|=') // Add "[" before and "]" after the attribute name and add "°" for color attribute
                      .replace(/"(.+?)"/g, '|["$1"°txt]|') // Add "[" before and "]" after the text and add "°" for color attribute
                      .replace(/(<\/?|>)/g, '|[$1°tag-bracket]|') // Add "[" before and "]" after the tag brackets and add "°" for color attribute
                      .split('|'); */
    let xmlSplit = xml.replace(/(<\/?)(\w+)|(\S+)=|"(.+?)"/g, function(match, tagStart, tagName, attrName, attrValue) {
        if (tagName) return `${tagStart}|[${tagName}°tag]|`;
        if (attrName) return `|[${attrName}°attr]|=`;
        if (attrValue) return `|["${attrValue}"°txt]|`;
        if (tagStartBracket) return `|[${tagStartBracket}°tag-bracket]|`;
        return match;
    }).replace(/(<\/?|>)/g, '|[$1°tag-bracket]|').split('|');
    //console.log(xmlSplit);
    let fragment = document.createDocumentFragment();
    xmlSplit.forEach(function(item) {
        if (item.startsWith('[') && item.endsWith(']')) {
            let ele = document.createElement('span');
            let itemSplit = item.substring(1, item.length - 1).split('°');
            ele.innerText = itemSplit[0];
            ele.style.color = `var(--color-svg-${itemSplit[1]}-1)`;
            fragment.appendChild(ele);
        } else {
            fragment.appendChild(document.createTextNode(item));
        }
    })
    container.innerHTML = '';
    container.appendChild(fragment);
}
function checkIndentation(input, indentSize = 2) {
    const lines = input.split('\n').filter(line => line.trim() !== '');
    const stack = [];
  
    for (let line of lines) {
      const trimmed = line.trim();
      const currentIndent = line.indexOf(trimmed);
  
      if (trimmed.startsWith('</')) {
        // Schließendes Tag → eine Ebene zurück
        if (stack.length === 0) return false;
        const expectedIndent = stack.pop();
        if (currentIndent !== expectedIndent) return false;
      } else if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
        // Öffnendes Tag → neue Ebene
        if (stack.length > 0 && currentIndent !== stack[stack.length - 1] + indentSize) {
          return false;
        } else if (stack.length === 0 && currentIndent !== 0) {
          return false;
        }
        stack.push(currentIndent);
      } else {
        // Zeile ist kein Tag → ignorieren oder Fehler
        return false;
      }
    }
  
    // Stack muss leer sein, sonst sind Tags nicht korrekt geschlossen
    return stack.length === 0;
}
function changeRows(rows) {
    editing.dataset.rows = rows;
    editing.style.setProperty('--rows', rows);
    if (editing == structureContainer) {
        previewContainer.style.setProperty('--rows', rows);
    }
    let grid = document.querySelector('#settings div:has(> [value="layout-grid"])');
    Array.from(grid.getElementsByTagName('div')).forEach(function(div) {
        div.remove();
    })
    grid.style.setProperty('--rows', rows);
    grid.insertAdjacentHTML('beforeend', '<div></div>'.repeat(grid.style.getPropertyValue('--rows') * grid.style.getPropertyValue('--cols')))
    refreshPreview();
}
function changeCols(cols) {
    editing.dataset.cols = cols;
    editing.style.setProperty('--cols', cols);
    if (editing == structureContainer) {
        previewContainer.style.setProperty('--cols', cols);
    }
    let grid = document.querySelector('#settings div:has(> [value="layout-grid"])');
    Array.from(grid.getElementsByTagName('div')).forEach(function(div) {
        div.remove();
    })
    grid.style.setProperty('--cols', cols);
    grid.insertAdjacentHTML('beforeend', '<div></div>'.repeat(grid.style.getPropertyValue('--rows') * grid.style.getPropertyValue('--cols')))
    refreshPreview();
}
function changeType(type) {
    /* editing.dataset.type = type;
    if (type == 'image') {
        editing.dataset.width = editing.dataset.height = '50%';
        editing.style.setProperty('--width', '50%');
        editing.style.setProperty('--height', '50%');
    } else {
        editing.style.removeProperty('--width');
        editing.style.removeProperty('--height');
    }
    settingsView(editing); */
    
    refreshPreview();
}
function changeLayout(layout) {
    layout = layout.value;
    let classes = [];
    classes.push(layout);
    classes.forEach(function(clas) {
        orientations.forEach(function(orientation) {
            if (!orientation.startsWith(clas.split("-")[0])) {
                return;
            }
            editing.classList.remove(orientation);
            if (editing == structureContainer) {
                previewContainer.classList.remove(orientation);
            }
        });
        editing.classList.add(clas);
    });
    if (editing == structureContainer) {
        previewContainer.classList.add(layout);
    }
    refreshPreview();
}
function removeElement() {
    editing.remove();
    refreshPreview();
}
// #endregion





// #region Selection
var savedRange, savedNodePosition, isInFocus;
function saveSelection(el) {
    if (window.getSelection) { //non IE Browsers
        savedRange = window.getSelection().getRangeAt(0);
        let selection = window.getSelection();
        let index = Array.prototype.indexOf.call(el.childNodes, selection.focusNode.parentNode);
        savedNodePosition = [index, selection.getRangeAt(0)];
        console.log(savedNodePosition);
    }
    else if (document.selection) { //IE
        savedRange = document.selection.createRange();
    }
}

function restoreSelection(el) {
    isInFocus = true;
    //console.log(el.childNodes[savedNodePosition[0]]);
    el.childNodes[savedNodePosition[0]].focus();
    if (savedNodePosition != null) {
        if (window.getSelection) { //non IE and there is already a selection
            var s = window.getSelection();
            console.log(s);
            if (s.rangeCount > 0) s.removeAllRanges();
            s.addRange(savedNodePosition[1]);
        }
        else if (document.createRange) { //non IE and no selection
            window.getSelection().addRange(savedRange);
        }
        else if (document.selection) { //IE
            savedRange.select();
        }
    }
}
// #endregion





// #region Theme switcher
function changeTheme() {
    Object.entries(colorVariables).forEach(function([key, val]) {
        var var1 = getComputedStyle(document.documentElement).getPropertyValue(key)
        var var2 = getComputedStyle(document.documentElement).getPropertyValue(val)
        document.documentElement.style.setProperty(key, var2);
        document.documentElement.style.setProperty(val, var1);
    })
}
if (localStorage.getItem('theme')) {
    var currentTheme = localStorage.getItem('theme');
} else {
    var currentTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? 'dark' : 'light';
}
let style = document.styleSheets[0].cssRules[0].style;
let styleDark = document.styleSheets[0].cssRules[1].cssRules[0].style;
var userTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
let colorVariables = {};
for (let i = 1; i < style.length; i=i+2) {
  colorVariables[style[i-1]] = style[i];
}

document.querySelectorAll('.changeTheme').forEach(el => {
    el.addEventListener('click', function() {
        changeTheme();
        currentTheme = currentTheme == 'dark' ? 'light' : 'dark';
        localStorage.setItem('theme', currentTheme);
    })
})
if (userTheme != currentTheme) {
    changeTheme();
}
Object.entries(colorVariables).forEach(function([key, val]) {
    var var1 = getComputedStyle(document.documentElement).getPropertyValue(key);
    var var2 = getComputedStyle(document.documentElement).getPropertyValue(val);
    styleDark.setProperty(key, var2);
    styleDark.setProperty(val, var1);
})
//#endregion



function refreshPreview() {
    let children = Array.from(previewContainer.children).concat(Array.from(outputHTMLContainer.children)).concat(Array.from(outputCSSContainer.children));
    children.forEach(function(child) {
        if (!child.classList.contains('nothing')) {
            child.remove();
        }
    })
    structureContainer.getAttributeNames().forEach(function(attr) {
        attr = attr.replace('data-', '');
        if (cssVariables.includes(attr)) {
            previewContainer.style.setProperty(`--${attr}`, structureContainer.getAttribute(`data-${attr}`));
        }
    })
    structureContainer.querySelectorAll('#structureContainer > *:not(:first-child)').forEach(function(child) {
        let preview = child.cloneNode(true);
        removeAttributes(preview);
        previewContainer.innerHTML += preview.outerHTML;
    })
    previewContainer.querySelectorAll('.structure-item:not(.container):not(.spacing)').forEach(function(el) {
        removeAttributes(el);
        /*if (!table) {
            return;
        }
        let value = table.rows[rowSelect.value].c[headers.indexOf(el.textContent.trim())]
        if (value) {
            if (el.dataset.type == 'image') {
                let img = changeElementTag(el, 'img');
                img.src = value.v;
            } else {
                el.innerHTML = value.v;
            }
        } else {
            if (el.dataset.name == 'text') {
                return;
            }
            el.innerHTML = el.dataset.empty != undefined ? el.dataset.empty : 'no data';
        }*/
    })
    /*if (rowSelect) {
        let value = rowSelect.value;
        rowSelect = document.querySelector('#previewContainer > select');
        rowSelect.value = value;
    }*/
}

function removeAttributes(ele) {
    ele.setAttribute('draggable', false);
    ele.classList.remove('editing');
    ele.classList.remove('header-item');
    ele.removeAttribute('id');
    ele.removeAttribute('ondragstart');
    ele.removeAttribute('ondragend');
    ele.removeAttribute('ondragover');
    ele.removeAttribute('ondrop');
}
function changeElementTag(element, newTag) {
    const newElement = document.createElement(newTag);
    Array.from(element.attributes).forEach(function(attr) {
        newElement.setAttribute(attr.nodeName, attr.nodeValue);
    });
    while (element.firstChild) {
        newElement.appendChild(element.firstChild);
    }
    element.parentNode.replaceChild(newElement, element);
    return newElement;
}
function convertToDashStyle(str) {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}
function stripHTML() {
    let html = document.querySelector('#previewContainer').innerHTML;
    var str = html.replace(/(\r\n|\n|\r)/gm, '').trim()
                  .replace(/<[^>]*?nothing.*?<\/\w+>/, '')
                  .replace(/>\s+</g, '><')
                  .replace(/(data-name="SVG".*)<img.*?>/g, '$1');
    document.body.insertAdjacentHTML('beforeend', str);
    outputHTMLContainer.childNodes.forEach(function(child) {
        if (child.classList && !child.classList.contains('nothing')) {
            child.remove();
        }
    })
    let pre = document.createElement('pre');
    outputHTMLContainer.appendChild(pre);
    formatXML(pre, str);
}