//#region State and bootstrap
let currentFactionDatasheets = [];

document.addEventListener('DOMContentLoaded', () => {
    renderArmy();
});
//#endregion

//#region Army display
async function getArmyDataAsJSON() {
    const response = await fetch('/get_army_data_as_JSON');
    return await response.json();
}

const modelStatOrder = ['m', 't', 'sv', 'w', 'ld', 'oc', 'invuln'];

async function renderArmy() {
    const army = await getArmyDataAsJSON();
    const display = document.getElementById('display');
    const units = army.units || [];

    display.innerHTML = `
        <h2>${army.army_name}</h2>
        <p>${units.length} unit${units.length === 1 ? '' : 's'}</p>
        <div class="army-units">
            ${units.map(unit => buildUnitCard(unit)).join('')}
        </div>
    `;
}

function buildModelCard(model){
    return `<div class="model-card">
                <h4>${model.count}x${model.model_name}</h4>
                <p>Model ID: ${model.model_id}</p>
                <p>Model Instance ID: ${model.model_instance_id}</p>
                <table>
                    <tr>
                        <th>M</th>
                        <th>T</th>
                        <th>SV</th>
                        <th>W</th>
                        <th>LD</th>
                        <th>OC</th>
                        <th>Invuln</th>
                    </tr>
                    <tr>
                        ${modelStatOrder.map(statName => `
                            <th>${model.stats[statName]}</th>
                        `).join('')}
                    </tr>
                </table>
                <form>
                ${model.weapons.map(weapon => {
                    return `<p><label for="model_weapons_${model.model_instance_id}">${weapon[0]}</label><input type="number" id="model_weapons_${model.model_instance_id}_${weapon[1]}" name="model_weapons_${model.model_instance_id}_${weapon[1]}" value="0" min="0"><p>`;
                }).join('')}
                </form>
            </div>`;
}

function buildUnitCard(unit){
    const totalModels = unit.models.reduce((sum, model) => sum + Number(model.count || 0), 0);

    return `<div class="unit-card">
                <h3>${unit.unit_name}</h3>
                <p>Unit ID: ${unit.unit_id}</p>
                <p>Unit Instance ID: ${unit.unit_instance_id}</p>
                <p>Models: ${totalModels}</p>
                <div class="unit-models">
                    ${unit.models.map(model => buildModelCard(model)).join('')}
                </div>
            </div>`;
}
//#endregion

//#region Faction selection and datasheet loading
function submitFaction() {
    const factionSelect = document.getElementById('faction_select');
    const faction_id = factionSelect.value;

    if (faction_id) {
        loadFactionData(faction_id);
    }
}

async function loadFactionData(faction_id) {
    const path = getFactionPath(faction_id);
    const datasheets = await getFactionDatasheetsByPath(path);
    currentFactionDatasheets = datasheets;

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
            appendUnitToArmy(currentFactionDatasheets, datasheet_id).then(() => {
                renderArmy();
            });
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
//#endregion

//#region Army mutation
async function appendUnitToArmy(datasheets, datasheet_id) {
    let selectedDatasheet = null;
    datasheets.forEach(datasheet => {
        if (datasheet.datasheet_id === datasheet_id) {
            selectedDatasheet = datasheet;
        }
    });

    const models = [];
    const datasheetModels = selectedDatasheet.models;
    datasheetModels.forEach(datasheetModel => {
        const model = {
            "model_name": datasheetModel.model_name,
            "model_id": datasheetModel.model_id,
            "stats": datasheetModel.stats,
            "count": datasheetModel.model_range[0],
            "weapons": datasheetModel.weapon_options,
            "wargear": datasheetModel.wargear_options
        };
        models.push(model);
    });

    const datasheet_name = selectedDatasheet.datasheet_name;

    const response = await fetch('/append_unit_to_army', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ models: models , datasheet_name: datasheet_name , datasheet_id: datasheet_id})
    });

    return await response.json();
}
//#endregion
