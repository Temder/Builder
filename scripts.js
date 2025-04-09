let elements = document.querySelectorAll('#elementsContainer .element');
let settings = document.getElementById('settings');
let structureContainer = document.getElementById('structureContainer');
let draggingElement = null;
let structureItem = null;
let editing = null;
let nearestField = null;
let rowSelect = null;
const cssVariables = ['width', 'height', 'margin', 'padding'];
const orientations = ['layout-vertical', 'layout-horizontal', 'layout-grid',
                      'horizontal-start','horizontal-center', 'horizontal-end',
                      'vertical-start',  'vertical-center',   'vertical-end'
];

document.onclick = function(event) {
    if (!settings.contains(event.target)) {
        let lastEdited = structureContainer.parentElement.querySelector('.editing')
        if (lastEdited) lastEdited.classList.remove('editing');
        if (structureContainer.contains(event.target) && event.target != lastEdited) {
            event.target.classList.add('editing');
            showSettings(event.target);
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
        if (el.getAttribute('data-name') == 'container') {
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
        if (['container', 'spacing'].includes(structureItem.getAttribute('data-name'))) {
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
            <h2>Editing "${ele.dataset.name.charAt(0).toUpperCase() + ele.dataset.name.slice(1)}"</h2>
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
                    <label>Min-Width</label>
                    <input size="1" name="minWidth" value="${ele.dataset.minWidth ? ele.dataset.minWidth : 'auto'}" oninput="this.size = this.value.length == 0 ? 1 : this.value.length; changeProperty(this);">
                    <br>
                    <label>Max-Width</label>
                    <input size="1" name="maxWidth" value="${ele.dataset.maxWidth ? ele.dataset.maxWidth : 'auto'}" oninput="this.size = this.value.length == 0 ? 1 : this.value.length; changeProperty(this);">
                </div>
                <div>
                    <label>Min-Height</label>
                    <input size="1" name="minHeight" value="${ele.dataset.minHeight ? ele.dataset.minHeight : 'auto'}" oninput="this.size = this.value.length == 0 ? 1 : this.value.length; changeProperty(this);">
                    <br>
                    <label>Max-Height</label>
                    <input size="1" name="maxHeight" value="${ele.dataset.maxHeight ? ele.dataset.maxHeight : 'auto'}" oninput="this.size = this.value.length == 0 ? 1 : this.value.length; changeProperty(this);">
                </div>
            </div>
        </details>
        <label class="layout">Layout</label>
        <div class="layout">
            <div><div>
                    <input type="radio" name="layout" value="layout-vertical" class="last-checked" onchange="changeLayout(this)"
                    ${ele.classList.contains('layout-vertical') ? 'checked' : ''}>
                    <div></div><div></div><div></div>
                </div>
                <div>
                    <input type="radio" name="layout" value="layout-horizontal" onchange="changeLayout(this)"
                    ${ele.classList.contains('layout-horizontal') ? 'checked' : ''}>
                    <div></div><div></div><div></div>
                </div>
                <div>
                    <input type="radio" name="layout" value="layout-grid" onchange="changeLayout(this)"
                    ${ele.classList.contains('layout-grid') ? 'checked' : ''}>
                    <input type="number" size="1" value="${ele.dataset.rows ? ele.dataset.rows : '2'}" oninput="this.size = this.value.length == 0 ? 1 : this.value.length; changeRows(this.value);">
                    <input type="number" size="1" value="${ele.dataset.cols ? ele.dataset.cols : '2'}" oninput="this.size = this.value.length == 0 ? 1 : this.value.length; changeCols(this.value);">
            </div></div>
        </div>
        <label class="layout orientation">Orientation</label>
        <div class="layout orientation">
            <div><div>
                    <input type="radio" name="orientation-h" value="horizontal-start" class="last-checked" onchange="changeLayout(this)"
                    ${ele.classList.contains('horizontal-start') ? 'checked' : ''}>
                    <div></div><div></div>
                </div>
                <div>
                    <input type="radio" name="orientation-h" value="horizontal-center" onchange="changeLayout(this)"
                    ${ele.classList.contains('horizontal-center') ? 'checked' : ''}>
                    <div></div><div></div>
                </div>
                <div>
                    <input type="radio" name="orientation-h" value="horizontal-end" onchange="changeLayout(this)"
                    ${ele.classList.contains('horizontal-end') ? 'checked' : ''}>
                    <div></div><div></div>
                </div>
                <div>
                    <input type="radio" name="orientation-v" value="vertical-start" class="last-checked" onchange="changeLayout(this)"
                    ${ele.classList.contains('vertical-start') ? 'checked' : ''}>
                    <div></div><div></div>
                </div>
                <div>
                    <input type="radio" name="orientation-v" value="vertical-center" onchange="changeLayout(this)"
                    ${ele.classList.contains('vertical-center') ? 'checked' : ''}>
                    <div></div><div></div>
                </div>
                <div>
                    <input type="radio" name="orientation-v" value="vertical-end" onchange="changeLayout(this)"
                    ${ele.classList.contains('vertical-end') ? 'checked' : ''}>
                    <div></div><div></div>
            </div></div>
        </div>
        <label for="type" class="type">Viewing Type</label>
        <select name="type" class="type" onchange="changeType(this.value)">
            <option value="text" ${ele.dataset.type == 'text' ? 'selected' : ''}>Text</option>
            <option value="image" ${ele.dataset.type == 'image' ? 'selected' : ''}>Image</option>
        </select>
        <label class="type">Empty Text</label>
        <input class="type" size="1" value="${ele.dataset.empty != undefined ? ele.dataset.empty : 'no data'}" oninput="this.size = this.value.length == 0 ? 1 : this.value.length; changeEmpty(this.value);">
        <label class="text">Text</label>
        <input class="text" size="1" value="${ele.innerText}" oninput="this.size = this.value.length == 0 ? 1 : this.value.length; changeText(this.value != '' ? this.value : 'no text');">
        <label class="image">Image URL</label>
        <input class="image" size="1" value="${ele.querySelector('img') ? ele.querySelector('img').src : 'noImage'}" oninput="this.size = this.value.length == 0 ? 1 : this.value.length; changeImage(this.value != '' ? this.value : '/graphics/placeholder.svg');">
    `;
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
    let property = self.name;
    editing.dataset[property] = self.value;
    if (self.value != 0) {
        //editing.style.setProperty(property, self.value ? self.value : 'none');
        editing.style.setProperty(`--${convertToDashStyle(property)}`, self.value ? self.value : 'none');
    } else {
        //editing.style.removeProperty(property);
        editing.style.removeProperty(`--${convertToDashStyle(property)}`);
    }
    refreshPreview();
}
function changeEmpty(empty) {
    editing.dataset.empty = empty;
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
    editing.dataset.type = type;
    if (type == 'image') {
        editing.dataset.width = editing.dataset.height = '50%';
        editing.style.setProperty('--width', '50%');
        editing.style.setProperty('--height', '50%');
    } else {
        editing.style.removeProperty('--width');
        editing.style.removeProperty('--height');
    }
    settingsView(editing);
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


function refreshPreview() {
    Array.from(previewContainer.children).forEach(function(child) {
        if (!child.classList.contains('nothing') && child.tagName != 'SELECT') {
            child.remove();
        }
    });
    structureContainer.getAttributeNames().forEach(function(attr) {
        attr = attr.replace('data-', '');
        if (cssVariables.includes(attr)) {
            previewContainer.style.setProperty(`--${attr}`, structureContainer.getAttribute(`data-${attr}`));
        }
    });
    structureContainer.querySelectorAll('#structureContainer > *:not(:first-child)').forEach(function(child) {
        let preview = child.cloneNode(true);
        removeAttributes(preview);
        previewContainer.innerHTML += preview.outerHTML;
    });
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
    });
    if (rowSelect) {
        let value = rowSelect.value;
        rowSelect = document.querySelector('#previewContainer > select');
        rowSelect.value = value;
    }
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