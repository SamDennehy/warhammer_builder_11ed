//faction handling functions
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

    const datasheetContainer = document.getElementById('datasheet_select');
    datasheetContainer.innerHTML = `
        <form id="datasheet_form">
            <select id="datasheet_select_input">
                <option value="">Select a datasheet</option>
            </select>
        </form>
    `;

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

