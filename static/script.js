//faction handling functions
lastUnitId = 0;

function submitFaction() {
    const factionSelect = document.getElementById('faction_select');
    const faction_id = factionSelect.value;

    if (faction_id) {
        loadFactionData(faction_id);
    }
}

async function getArmyDataAsJSON() {
    const response = await fetch('/get_army_data_as_JSON');
    return await response.json();
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
            //appendUnit(datasheets, datasheet_id);
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


async function appendUnitToArmy(datasheets, datasheet_id) {
    let selectedDatasheet = null;
    datasheets.forEach(datasheet => {
        if (datasheet.datasheet_id === datasheet_id) {
           selectedDatasheet = datasheet;
        }
    })
    const models = [];
    const datasheetModels = selectedDatasheet.models;
    datasheetModels.forEach(datasheetModel => {
        const min = datasheetModel.model_range[0]
        for(let i = 0; i < min; i++){
            const model = {
            "model_name": datasheetModel.model_name,
            "model_id": datasheetModel.model_id,
            "stats": datasheetModel.stats
            }
            models.push(model);
        }
    })

    const datasheet_name = selectedDatasheet.datasheet_name;

    const response = await fetch('/append_unit_to_army', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ models: models , datasheet_name: datasheet_name , datasheet_id: datasheet_id}) 
    });
}

