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
        <button type="button" id="validate-army-button">Check Army Rules</button>
        <div id="validation-result" role="status" aria-live="polite"></div>
    `;

    document.getElementById('validate-army-button').addEventListener('click', validateArmy);
    document.querySelectorAll('.unit-toggle').forEach(toggle => {
        toggle.addEventListener('click', () => {
            const content = document.getElementById(toggle.getAttribute('aria-controls'));
            const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
            toggle.setAttribute('aria-expanded', String(!isExpanded));
            toggle.textContent = isExpanded ? 'Expand unit' : 'Collapse unit';
            content.hidden = isExpanded;
        });
    });
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
            </div>`;
}

function buildOptionForm(options, prefix) {
    if (!options.length) {
        return '';
    }

    return `<div class="unit-options">
                ${options.map(option => {
                    const optionId = option.weapon_id || option.wargear_id;
                    const optionLimit = Number.isInteger(option.max) ? `<small>Limit: ${option.max}</small>` : '';
                    const maxAttribute = Number.isInteger(option.max) ? ` max="${option.max}"` : '';
                    const optionType = option.weapon_id ? 'weapon' : 'wargear';
                    const selectionKey = option.selection_key || optionId;
                    return `<p><label for="${prefix}_${optionId}">${option.weapon_name || option.wargear_name}${optionLimit}</label><input type="number" data-option-type="${optionType}" data-option-id="${optionId}" data-selection-key="${selectionKey}" id="${prefix}_${optionId}" name="${prefix}_${optionId}" value="${option.selected || 0}" min="0"${maxAttribute}></p>`;
                }).join('')}
            </div>`;
}

function buildWeaponGroups(groups, prefix) {
    if (!groups.length) {
        return '';
    }

    return `<div class="weapon-groups">
                ${groups.map(group => `
                    <fieldset>
                        <legend>${group.group_name} (maximum ${group.max})</legend>
                        ${buildOptionForm(group.options || [], `${prefix}_${group.group_id}`)}
                    </fieldset>
                `).join('')}
            </div>`;
}

function buildUnitCard(unit){
    const totalModels = unit.models.reduce((sum, model) => sum + Number(model.count || 0), 0);

    return `<div class="unit-card" data-unit-instance-id="${unit.unit_instance_id}">
                <div class="unit-card-header">
                    <h3>${unit.unit_name}</h3>
                    <button type="button" class="unit-toggle" aria-expanded="true" aria-controls="unit-content-${unit.unit_instance_id}">Collapse unit</button>
                </div>
                <p>Unit ID: ${unit.unit_id}</p>
                <p>Unit Instance ID: ${unit.unit_instance_id}</p>
                <p>Models: ${totalModels}</p>
                <div id="unit-content-${unit.unit_instance_id}" class="unit-card-content">
                    <div class="unit-models">
                        ${unit.models.map(model => buildModelCard(model)).join('')}
                    </div>
                    ${buildWeaponGroups(unit.weapon_groups || [], `unit_weapons_${unit.unit_instance_id}`)}
                    ${buildOptionForm(unit.wargear || [], `unit_wargear_${unit.unit_instance_id}`)}
                </div>
            </div>`;
}

async function validateArmy() {
    const units = {};
    document.querySelectorAll('.unit-card').forEach(unitCard => {
        const unitSelections = { weapon_selections: {}, wargear_selections: {} };
        const unitId = unitCard.dataset.unitInstanceId;
        unitCard.querySelectorAll('input[data-option-type]').forEach(input => {
            const optionType = input.dataset.optionType;
            const selections = optionType === 'weapon'
                ? unitSelections.weapon_selections
                : unitSelections.wargear_selections;
            selections[input.dataset.selectionKey || input.dataset.optionId] = Number(input.value || 0);
        });
        units[unitId] = unitSelections;
    });

    const response = await fetch('/validate_army', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ units: units })
    });
    const result = await response.json();
    const validationResult = document.getElementById('validation-result');
    validationResult.className = result.valid ? 'valid' : 'invalid';
    validationResult.innerHTML = result.valid
        ? '<strong>Army is valid.</strong>'
        : `<strong>Army is invalid.</strong><ul>${result.errors.map(error => `<li>${error}</li>`).join('')}</ul>`;
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
            <button type="button" id="datasheet_submit">Add Unit</button>
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
            "count": datasheetModel.model_range[0]
        };
        models.push(model);
    });

    const weapons = getUniqueOptions(datasheetModels, 'weapon_options');
    const wargear = getUniqueOptions(datasheetModels, 'wargear_options');
    const weapon_groups = selectedDatasheet.weapon_groups || [];

    const datasheet_name = selectedDatasheet.datasheet_name;

    const response = await fetch('/append_unit_to_army', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            models: models,
            datasheet_name: datasheet_name,
            datasheet_id: datasheet_id,
            weapons: weapons,
            wargear: wargear,
            weapon_groups: weapon_groups
        })
    });

    return await response.json();
}

function getUniqueOptions(datasheetModels, optionKey) {
    const optionsById = new Map();

    datasheetModels.forEach(datasheetModel => {
        (datasheetModel[optionKey] || []).forEach(option => {
            const optionId = option[1];
            const weapon = (datasheetModel.weapons || []).find(
                candidate => candidate.weapon_id === optionId
            );
            const slot = weapon?.type || (option[2] === 0 ? 'melee' : 'ranged');
            if (!optionsById.has(optionId)) {
                const isWeapon = optionKey === 'weapon_options';
                optionsById.set(optionId, {
                    [isWeapon ? 'weapon_id' : 'wargear_id']: optionId,
                    [isWeapon ? 'weapon_name' : 'wargear_name']: option[0],
                    eligible_models: [datasheetModel.model_id],
                    limit: weapon?.limit || { type: 'per_model', amount: 1 },
                    slot: slot,
                    selected: 0
                });
            } else {
                const existingOption = optionsById.get(optionId);
                if (!existingOption.eligible_models.includes(datasheetModel.model_id)) {
                    existingOption.eligible_models.push(datasheetModel.model_id);
                }
            }
        });
    });

    return Array.from(optionsById.values());
}
//#endregion
