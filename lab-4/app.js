const STORAGE_KEY = 'kanban-board-v1';

function randomPastel() {
    const hue = Math.floor(Math.random() * 360);
    const sat = 70;
    const light = 85;
    return `hsl(${hue} ${sat}% ${light}%)`;
}

function textColorFor(bg) {
    const ctx = document.createElement('canvas');
    const c = ctx.getContext('2d');
    c.fillStyle = bg;
    const rgb = c.fillStyle.match(/\d+/g).map(Number);
    const [r, g, b] = rgb;
    const L =
        0.2126 * (r / 255) ** 2.2 +
        0.7152 * (g / 255) ** 2.2 +
        0.0722 * (b / 255) ** 2.2;
    return L > 0.6 ? '#1c2337' : '#ffffff';
}

const uid = () =>
    crypto?.randomUUID?.() ??
    `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const state = {
    columns: {
        todo: [],
        doing: [],
        done: [],
    },
};

function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function load() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (!parsed?.columns) return;
        state.columns = parsed.columns;
    } catch (e) {
        console.warn('Błąd wczytania stanu:', e);
    }
}

const lists = {
    todo: document.querySelector('[data-list="todo"]'),
    doing: document.querySelector('[data-list="doing"]'),
    done: document.querySelector('[data-list="done"]'),
};
const counters = {
    todo: document.querySelector('[data-counter="todo"]'),
    doing: document.querySelector('[data-counter="doing"]'),
    done: document.querySelector('[data-counter="done"]'),
};

function render() {
    /** @type {("todo"|"doing"|"done")[]} */ ([
        'todo',
        'doing',
        'done',
    ]).forEach((colKey) => {
        const container = lists[colKey];
        container.innerHTML = '';
        const cards = state.columns[colKey];

        cards.forEach((card, index) => {
            container.appendChild(createCardElement(card, colKey, index));
        });

        counters[colKey].textContent = String(cards.length);
    });
}

function createCardElement(card, colKey, index) {
    const el = document.createElement('div');
    el.className = 'card';
    el.dataset.cardId = card.id;
    el.style.background = card.color;
    el.style.color = textColorFor(card.color);

    const header = document.createElement('div');
    header.className = 'card-header';

    const title = document.createElement('div');
    title.className = 'card-title';
    title.textContent = card.title || 'Bez tytułu';

    const buttons = document.createElement('div');
    buttons.className = 'card-buttons';

    const colBtn = document.createElement('button');
    colBtn.className = 'btn icon';
    colBtn.dataset.action = 'color-card';
    colBtn.dataset.cardId = card.id;
    colBtn.setAttribute('data-title', 'Losowy kolor karty');
    colBtn.innerHTML = '🎨';

    const leftBtn = document.createElement('button');
    leftBtn.className = 'btn icon';
    leftBtn.dataset.action = 'move-left';
    leftBtn.dataset.cardId = card.id;
    leftBtn.setAttribute('data-title', 'Przenieś w lewo');
    leftBtn.innerHTML = '←';
    if (colKey === 'todo') leftBtn.disabled = true;

    const rightBtn = document.createElement('button');
    rightBtn.className = 'btn icon';
    rightBtn.dataset.action = 'move-right';
    rightBtn.dataset.cardId = card.id;
    rightBtn.setAttribute('data-title', 'Przenieś w prawo');
    rightBtn.innerHTML = '→';
    if (colKey === 'done') rightBtn.disabled = true;

    const delBtn = document.createElement('button');
    delBtn.className = 'btn icon danger';
    delBtn.dataset.action = 'delete-card';
    delBtn.dataset.cardId = card.id;
    delBtn.setAttribute('data-title', 'Usuń kartę');
    delBtn.innerHTML = '✕';

    buttons.append(colBtn, leftBtn, rightBtn, delBtn);
    header.append(title, buttons);

    const content = document.createElement('div');
    content.className = 'card-content';
    content.contentEditable = 'true';
    content.spellcheck = false;
    content.dataset.cardId = card.id;
    content.innerHTML = card.text || '';

    content.addEventListener('input', () => {
        const found = findCardById(card.id);
        if (found) {
            found.card.text = content.innerHTML;
            if (!found.card.title || found.card.title === 'Nowa karta') {
                const firstLine =
                    content.textContent.trim().split('\n')[0] || 'Bez tytułu';
                found.card.title = firstLine.slice(0, 60);
            }
            save();

            title.textContent = found.card.title || 'Bez tytułu';
        }
    });

    el.append(header, content);
    return el;
}

function findCardById(id) {
    for (const colKey of ['todo', 'doing', 'done']) {
        const idx = state.columns[colKey].findIndex((c) => c.id === id);
        if (idx !== -1) {
            return { colKey, index: idx, card: state.columns[colKey][idx] };
        }
    }
    return null;
}

function addCard(colKey, { focus = true } = {}) {
    const newCard = {
        id: uid(),
        title: 'Nowa karta',
        text: '',
        color: randomPastel(),
    };
    state.columns[colKey].push(newCard);
    save();
    render();
    if (focus) {
        const el = lists[colKey].querySelector(
            `[data-card-id="${newCard.id}"] .card-content`
        );
        el?.focus();
    }
}

function deleteCard(id) {
    const found = findCardById(id);
    if (!found) return;
    state.columns[found.colKey].splice(found.index, 1);
    save();
    render();
}

function moveCard(id, dir) {
    const order = ['todo', 'doing', 'done'];
    const found = findCardById(id);
    if (!found) return;
    const fromIdx = order.indexOf(found.colKey);
    const toIdx = fromIdx + (dir === 'left' ? -1 : 1);
    if (toIdx < 0 || toIdx >= order.length) return;
    state.columns[found.colKey].splice(found.index, 1);
    state.columns[order[toIdx]].push(found.card);
    save();
    render();
}

function colorCard(id) {
    const found = findCardById(id);
    if (!found) return;
    found.card.color = randomPastel();
    save();
    render();
}

function colorColumn(colKey) {
    state.columns[colKey] = state.columns[colKey].map((c) => ({
        ...c,
        color: randomPastel(),
    }));
    save();
    render();
}

function sortColumn(colKey) {
    state.columns[colKey].sort((a, b) => {
        const ta = (a.title || '').trim().toLowerCase();
        const tb = (b.title || '').trim().toLowerCase();
        return ta.localeCompare(tb, 'pl');
    });
    save();
    render();
}

document.querySelectorAll('.column').forEach((colEl) => {
    colEl.addEventListener('click', (e) => {
        const t = /** @type {HTMLElement} */ (e.target);
        const actionBtn = t.closest('[data-action]');
        if (!actionBtn) return;

        const action = actionBtn.getAttribute('data-action');
        const colKey = colEl.getAttribute('data-col');

        switch (action) {
            case 'add-card':
                addCard(colKey);
                break;
            case 'color-column':
                colorColumn(colKey);
                break;
            case 'sort':
                sortColumn(colKey);
                break;
            case 'delete-card':
                deleteCard(actionBtn.dataset.cardId);
                break;
            case 'move-left':
                moveCard(actionBtn.dataset.cardId, 'left');
                break;
            case 'move-right':
                moveCard(actionBtn.dataset.cardId, 'right');
                break;
            case 'color-card':
                colorCard(actionBtn.dataset.cardId);
                break;
        }
    });
});

load();
render();

if (
    state.columns.todo.length === 0 &&
    state.columns.doing.length === 0 &&
    state.columns.done.length === 0
) {
    addCard('todo', { focus: false });
}
