//faction handling functions
lastUnitId = 0;

function submitFaction() {
    const factionSelect = document.getElementById('faction_select');
    const faction_id = factionSelect.value;

    if (faction_id) {
        loadFactionData(faction_id);
    }
}

function loadModel(model, unitContainer) {
    const stats = model.stats;
        const movement = stats.m;
        const toughness = stats.t;
        const save = stats.sv;
        const wounds = stats.w;
        const leadership = stats.ld;
        const oc = stats.oc;
        const invuln = stats.invuln;
    
    const modelContainer = document.createElement('div');
    modelContainer.classList.add('model-container');
    modelContainer.innerHTML = `
        <h3>${model.model_name}</h3>
        <p>Movement: ${movement}</p>
        <p>Toughness: ${toughness}</p>
        <p>Save: ${save}</p>
        <p>Wounds: ${wounds}</p>
        <p>Leadership: ${leadership}</p>
        <p>Objective Control: ${oc}</p>
        <p>Invulnerable Save: ${invuln}</p>
    `;
    unitContainer.appendChild(modelContainer);


}

function appendUnit(datasheets, datasheet_id) {
    const selectedDatasheet = getSelectedDatasheetById(datasheets, datasheet_id);
    const models = getDatasheetModels(selectedDatasheet);
    const unitContainer = document.createElement('div');
    unitContainer.innerHTML = `<h2>${selectedDatasheet.datasheet_name}</h2>`;
    unitContainer.id = `unit-${++lastUnitId}`;
    unitContainer.classList.add('unit-container');
    document.getElementById('display').appendChild(unitContainer);
    models.forEach(model => loadModel(model, unitContainer));
}

async function loadFactionData(faction_id) {
    const path = getFactionPath(faction_id);
    const datasheets = await getFactionDatasheetsByPath(path);

    const datasheetContainer = document.getElementById('datasheet_select');
    datasheetContainer.innerHTML = `
        <form id="datasheet_form">
            <select id="datasheet_select_input">
                <option value="">Select a datasheet</option>
            </select>
            <button type="button" id="datasheet_submit">Submit</button>
        </form>
    `;

    document.getElementById('datasheet_submit').addEventListener('click', () => {
        const datasheet_id = document.getElementById('datasheet_select_input').value;
        if (datasheet_id) {
            appendUnit(datasheets, datasheet_id);
        }
    });

    const datasheetSelect = document.getElementById('datasheet_select_input');
    datasheets.forEach(datasheet => {
        const option = document.createElement('option');
        option.value = datasheet.datasheet_id;
        option.textContent = datasheet.datasheet_name;
        datasheetSelect.appendChild(option);
    });
}

function getFactionPath(faction_id) {
    console.log("faction_id:", faction_id);
    return `armies/${faction_id}`;
}

async function getFactionDatasheetsByPath(path) {
    const response = await fetch('/get_faction_datasheets_by_path', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ path: path })
    });
    const datasheets = await response.json();
    return datasheets;
}

function getSelectedDatasheetById(datasheets, datasheet_id) {
    return datasheets.find(datasheet => datasheet.datasheet_id === datasheet_id);
}

function getDatasheetModels(datasheet) {
    return datasheet.models;
}

