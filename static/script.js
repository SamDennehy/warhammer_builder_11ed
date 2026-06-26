console.log("JS is working");

// Constants
const abilityFiles = window.abilityFiles;
const detachmentRuleFiles = window.detachmentRuleFiles;

// Global variables
let currentArmy = window.currentArmy;
let currentDetachment = window.currentDetachment;
let detachmentEnhancements = JSON.parse(sessionStorage.getItem('detachmentEnhancements')) || (currentDetachment === null ? null : currentDetachment.enhancements);
let enhancementTracker = JSON.parse(sessionStorage.getItem('enhancementTracker')) || [];

// Clear old enhancementTracker data that doesn't have content
enhancementTracker = enhancementTracker.filter(item => item.content !== undefined);
sessionStorage.setItem('enhancementTracker', JSON.stringify(enhancementTracker));

// Initialization
async function loadArmy() {
    const response = await fetch("/api/army");
    const data = await response.json();
    renderDetachmentRules(null);
    currentArmy = data.army;
    renderArmy(currentArmy, currentDetachment);
}

// Event handlers
document.getElementById("add-unit-btn").addEventListener("click", async function (event) {
    event.preventDefault();

    const selectedUnit = document.getElementById("unit").value;

    const response = await fetch("/api/add-unit", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            unit: selectedUnit
        })
    });

    const data = await response.json();
    currentArmy = data.army;
    renderArmy(currentArmy, currentDetachment);
});

document.getElementById("update-detachment-btn").addEventListener("click", async function (event) {
    event.preventDefault();

    const selectedDetachment = document.getElementById("detachment-select").value;

    const response = await fetch("/api/update-detachment", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            detachment: selectedDetachment
        })
    });

    const data = await response.json();
    currentDetachment = data.detachment;
    detachmentEnhancements = currentDetachment ? currentDetachment.enhancements : null;
    enhancementTracker = [];
    sessionStorage.removeItem('enhancementTracker');
    sessionStorage.setItem('detachmentEnhancements', JSON.stringify(detachmentEnhancements));
    renderArmy(currentArmy, currentDetachment);
});

document.getElementById("reset-army-btn").addEventListener("click", async function () {
    const response = await fetch("/api/reset", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        }
    });

    const data = await response.json();
    currentArmy = data.army;
    currentDetachment = null;
    detachmentEnhancements = null;
    enhancementTracker = [];
    sessionStorage.removeItem('enhancementTracker');
    renderArmy(currentArmy, currentDetachment);
});

// Main rendering functions
function renderArmy(army, detachment) {
    const detachmentRuleSection = document.getElementById("detachment-rules")
    const container = document.getElementById("army-list");

    detachmentRuleSection.innerHTML = renderDetachmentRules(detachment);

    if (army === null || army.length === 0) {
        container.innerHTML = renderEmptyArmy();
        return;
    }

    const totalPoints = calculateTotalPoints(army);
    console.log("available enhancements:", detachmentEnhancements);

    container.innerHTML = `
        <ul>
            ${army.map((unit, unitIndex) => renderUnit(unit, unitIndex, detachmentEnhancements)).join("")}
        </ul>

        ${renderArmyTotal(totalPoints)}
    `;
}

function renderUnit(unit, unitIndex, enhancements) {
    return `
        <li>
            <div class="unit-card">
                <div class="unit-left">
                    ${renderUnitHeader(unit, unitIndex)}
                    ${renderUnitModels(unit, unitIndex)}
                    ${currentDetachment !== null ? renderEnhancementOptions(enhancements, unitIndex) + renderEnhancementButtons(unitIndex) + renderUnitEnhancements(unitIndex) : ""}
                    ${renderUnitAbilities(unit)}
                    ${renderRemoveButton(unitIndex)}
                </div>
            </div>
        </li>
    `;
}

function renderUnitModels(unit, unitIndex) {
    const modelsById = new Map();

    (unit.models || []).forEach((model, index) => {
        const modelKey = (model.model_id === undefined || model.model_id === null)
            ? `__model-index-${index}`
            : String(model.model_id);

        if (!modelsById.has(modelKey)) {
            modelsById.set(modelKey, []);
        }

        modelsById.get(modelKey).push(model);
    });

    return Array.from(modelsById.values()).map(modelGroup => {
        const modelId = modelGroup[0].model_id;
        const modelName = modelGroup[0].name || "Model";
        const firstModel = modelGroup[0];
        const minCount = (firstModel.range && firstModel.range[0]) || 1;
        const maxCount = (firstModel.range && firstModel.range[1]) || (firstModel.count || minCount);
        //console.log(minCount, maxCount);

        return `
            <details class="model-group" data-model-id="${modelId}" open>
                <summary class="model-group-toggle">${modelName} (ID: ${modelId}) x${modelGroup.length}</summary>
                <div class="model-group-content">
                    ${modelGroup.map(model => renderModelCard(unitIndex, model)).join("")}
                </div>
                ${(minCount !== maxCount) ? `
                    <label for="Models">Quantity:</label>
                    <input type="number" id="modelCount-${unitIndex}-${firstModel.model_id}-${firstModel.model_number}" name="modelCount" min="${minCount}" max="${maxCount}">
                ` : ``}
            </details>
        `;
    }).join("");
}

function renderModelCard(unitIndex, model) {
    return `
        <div class="model-card">
            <div class="model-left">
                <h4>${model.name}</h4>
                ${renderStatsTable(model.stats)}
                ${renderModelExtra(model)}
                ${renderWeaponOptions(model, unitIndex)}
                ${renderWeaponButton(unitIndex, model.model_id, model.model_number)}
                ${renderWargearOptions(model, unitIndex)}
                ${renderWargearButton(unitIndex, model.model_id, model.model_number, model.wargear_options)}
            </div>
            <div class="model-right">
                ${renderSelectedWeapons(model.selected_weapons)}
                ${renderSelectedWargear(model.selected_wargear)}
            </div>
        </div>
    `;
}

function renderDetachmentRules(selectedDetachment) {
    if (selectedDetachment === null) {
        return `
            <div class = "text-file">no detachment selected</div>
        `
    }

    const rule = selectedDetachment.rule;
    console.log("Selected detachment:", selectedDetachment);
    console.log("Selected detachment rule:", rule);

    for (let i = 0; i < detachmentRuleFiles.length; i++) {
        if (detachmentRuleFiles[i][rule] !== undefined) {
            return `<div class="text-file">${detachmentRuleFiles[i][rule]}</div>`
        }
    }
    return `<div class="text-file">Detachment not found</div>`
}

// Unit component renderers
function renderUnitHeader(unit, unitIndex) {
    for (let i = 0; i <enhancementTracker.length; i++) {
        if (enhancementTracker[i].unitIndex === unitIndex) {
            return `<h3>${unit.name} (${unit.points + enhancementTracker[i].enhancement.points} pts) - ${enhancementTracker[i].enhancement.name}</h3>`;
        }
    }
    return `<h3>${unit.name} (${unit.points} pts)</h3>`;
}
    
function renderStatsTable(stats) {
    if (!stats) {
        return "";
    }

    return `
        <table>
            <tr>
                <th>M</th>
                <th>T</th>
                <th>SV</th>
                <th>W</th>
                <th>LD</th>
                <th>OC</th>
            </tr>
            <tr>
                <td>${stats.m}"</td>
                <td>${stats.t}</td>
                <td>${stats.sv}</td>
                <td>${stats.w}</td>
                <td>${stats.ld}</td>
                <td>${stats.oc}</td>
            </tr>
        </table>
    `;
}

function renderModelExtra(model) {
    const invuln = model.stats?.invuln;
    const formattedInvuln = (invuln === undefined || invuln === null || invuln === "N/A") ? "N/A" : `${invuln}+`;

    return `
        <div class="unit-extra">
            Invuln: ${formattedInvuln}
            Model Number: ${model.model_number}
            Model ID: ${model.model_id}
        </div>
    `;
}

function renderUnitAbilities(unit) {
    const abilities = unit.abilities || { core: [], personal: [] };
    const coreAbilities = abilities["core"] || [];
    const personalAbilities = abilities["personal"] || [];

    if (!coreAbilities.length && !personalAbilities.length) {
        return "";
    }

    return `<h3>Abilities</h3>
    <div class="abilities">
    ${coreAbilities.map((ability) => `
        <div class="ability-card">${ability}</div>
    `).join("")}
    ${personalAbilities.map((ability) => `
        <div class="ability-card">${abilityFiles[ability] || `${ability}`}</div>
    `).join("")}
    </div>`
}

// Weapon component renderers
function renderWeaponOptions(model, unitIndex) {
    const options = model.weapon_options || [];
    if (!options.length) {
        return "";
    }

    return options.map(option => renderWeaponOption(option, model, unitIndex)).join("");
}

function renderWeaponOption(option, model, unitIndex) {
    return `
        <div class="weapon-option">
            <label for="weapon-${unitIndex}-${model.model_id}-${model.model_number}-${option.group}">${option.group}</label>
            <select
                id="weapon-${unitIndex}-${model.model_id}-${model.model_number}-${option.group}"
                class="weapon-select"
                data-unit-index="${unitIndex}"
                data-model-id="${model.model_id}"
                data-model-number="${model.model_number}"
                data-group="${option.group}"
            >
                ${option.choices.map(choice => renderWeaponChoice(choice, model, option)).join("")}
            </select>
        </div>
    `;
}

function renderWeaponChoice(choice, model, option) {
    const choiceId = typeof choice === "string" ? choice : (choice.id || choice.weapon_id || choice.value || "");
    if (!choiceId) {
        return "";
    }

    const weaponName = (model.available_weapons || []).find(weapon => weapon.id === choiceId)?.name || choiceId;

    return `
        <option value="${choiceId}" ${choiceId === model.weapons[option.group] ? "selected" : ""}>
            ${weaponName}
        </option>
    `;
}

function renderWeaponButton(unitIndex, modelId, modelNumber) {
    return `
        <button type="button" onclick='updateWeapons(${unitIndex}, ${JSON.stringify(modelId)}, ${modelNumber})'>
        Update Loadout
        </button>
    `;
}

function renderSelectedWeapons(selectedWeapons) {
    if (!selectedWeapons || !selectedWeapons.length) {
        return "<p>No weapons selected yet.</p>";
    }

    return selectedWeapons.map(weapon => renderWeaponCard(weapon)).join("");
}

function renderWeaponCard(weapon) {
    return `
        <div class="weapon">
            <h4>${weapon.name}</h4>
            ${renderWeaponInstruction(weapon)}
            ${weapon.profiles.map(profile => renderWeaponProfile(weapon, profile)).join("")}
        </div>
    `;
}

function renderWeaponInstruction(weapon) {
    return weapon.profiles.length > 1
        ? `<p class="weapon-instruction">Before selecting targets for this weapon, select one of its profiles to make attacks with.</p>`
        : "";
}

function renderWeaponProfile(weapon, profile) {
    const profileName = profile.name || profile.profile_name || "";

    return `
        <h5>${weapon.profiles.length > 1 ? profileName : ""}</h5>
        <table>
            <tr>
                <th>Range</th>
                <th>A</th>
                <th>${weapon.type === "ranged" ? "BS" : "WS"}</th>
                <th>S</th>
                <th>AP</th>
                <th>D</th>
            </tr>
            <tr>
                <td>${profile.range}${profile.range !== "melee" ? '"' : ""}</td>
                <td>${profile.attacks}</td>
                <td>${profile.to_hit}</td>
                <td>${profile.strength}</td>
                <td>${profile.ap}</td>
                <td>${profile.damage}</td>
            </tr>
        </table>
    `;
}

// Wargear component renderers
function renderWargearOptions(model, unitIndex) {
    const options = model.wargear_options || [];
    if (!options.length) {
        return "";
    }

    return options.map(option => renderWargearOption(option, model, unitIndex)).join("");
}

function renderWargearOption(option, model, unitIndex) {
    return `
        <div class="weapon-option">
            <label for="wargear-${unitIndex}-${model.model_id}-${model.model_number}-${option.group}">${option.group}</label>
            <select
                id="wargear-${unitIndex}-${model.model_id}-${model.model_number}-${option.group}"
                class="wargear-select"
                data-unit-index="${unitIndex}"
                data-model-id="${model.model_id}"
                data-model-number="${model.model_number}"
                data-group="${option.group}"
            >
                ${option.choices.map(choice => renderWargearChoice(choice, model, option)).join("")}
            </select>
        </div>
    `;
}

function renderWargearChoice(choice, model, option) {
    const choiceId = typeof choice === "string" ? choice : (choice.id || choice.wargear_id || choice.value || "");
    if (!choiceId) {
        return "";
    }

    const wargearName = (model.available_wargear || []).find(wargear => wargear.id === choiceId)?.name
        || (typeof choice === "string" ? choice : (choice.name || choice.wargear_name || choiceId));

    return `
        <option value="${choiceId}" ${choiceId === model.wargear[option.group] ? "selected" : ""}>
            ${wargearName}
        </option>
    `;
}

function renderWargearButton(unitIndex, modelId, modelNumber, wargearOptions) {
    if (!wargearOptions || !wargearOptions.length) {
        return "";
    }

    return `
        <button type="button" onclick='updateWargear(${unitIndex}, ${JSON.stringify(modelId)}, ${modelNumber})'>
        Update Wargear
        </button>
    `;
}

function renderSelectedWargear(selectedWargear) {
    if (!selectedWargear || !selectedWargear.length) {
        return "";
    }

    return `
        <h4>Wargear</h4>
        ${selectedWargear.map(wargear => `<div class="ability-card">${wargear.name}</div>`).join("")}
    `;
}

// Enhancement component renderers
function renderEnhancementOptions(enhancements, unitIndex) {
    if (enhancements === null) {
        return "";
    }
    return `
        <div class ="enhancement-options">
            <label for="enhancement-select-${unitIndex}">Enhancements</label>
            <select id="enhancement-select-${unitIndex}">
                ${enhancements.map(enhancement => `
                    <option value="${enhancement.id}">${enhancement.name}</option>
                `).join("")}
            </select>
        </div>
    `;
}

function renderEnhancementButtons(index) {
    return `
        <button type="button" onclick="updateEnhancements(${index})">
        Update<br>Enhancements
        </button>

        <button type="button" onclick="removeEnhancement(${index})">
        Remove<br>Enhancements
        </button>
    `;
}

function renderUnitEnhancements(unitIndex) {
    for (let i = 0; i < enhancementTracker.length; i++) {
        if (enhancementTracker[i].unitIndex === unitIndex) {
            const content = enhancementTracker[i].content || `${enhancementTracker[i].enhancement.name}:<br>[Content loading...]`;
            return `<div class="ability-card">${content}</div>`;
        }
    }
    return "";
}

// Utility functions
function renderEmptyArmy() {
    return "<p>No units selected yet.</p>";
}

function calculateTotalPoints(army) {
    const enhancementPoints = enhancementTracker.reduce((sum, item) => sum + item.enhancement.points, 0);

    return army.reduce((sum, unit) => sum + unit.points, 0) + enhancementPoints;
}

function renderArmyTotal(totalPoints) {
    return `<p><strong>Total Points: ${totalPoints}</strong></p>`;
}

function renderRemoveButton(index) {
    return `
        <button type="button" onclick="removeUnit(${index})">
            Remove Unit
        </button>
    `;
}

// API functions
async function updateWeapons(index, modelId, modelNumber) {
    const selects = document.querySelectorAll(`.weapon-select[data-unit-index="${index}"][data-model-number="${modelNumber}"]`);
    const weapons = {};

    selects.forEach(select => {
        const group = select.dataset.group;
        weapons[group] = select.value;
    });

    console.log("Selected weapons for unit", index, weapons);
    const response = await fetch("/api/select-weapons", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            unit_index: index,
            model_id: modelId,
            model_number: modelNumber,
            weapons: weapons
        })
    });

    const data = await response.json();
    currentArmy = data.army;
    renderArmy(currentArmy, currentDetachment);
}

async function updateWargear(index, modelId, modelNumber) {
    const selects = document.querySelectorAll(`.wargear-select[data-unit-index="${index}"][data-model-number="${modelNumber}"]`);
    const wargear = {};

    selects.forEach(select => {
        const group = select.dataset.group;
        wargear[group] = select.value;
    });

    const response = await fetch("/api/select-wargear", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            unit_index: index,
            model_id: modelId,
            model_number: modelNumber,
            wargear: wargear
        })
    });

    const data = await response.json();
    currentArmy = data.army;
    renderArmy(currentArmy, currentDetachment);
}

async function removeUnit(index) {
    // Find if the unit has an enhancement and remove it from tracker, add back to available
    const trackerIndex = enhancementTracker.findIndex(item => item.unitIndex === index);
    if (trackerIndex !== -1) {
        const removedEnhancement = enhancementTracker[trackerIndex].enhancement;
        enhancementTracker.splice(trackerIndex, 1);
        if (detachmentEnhancements) {
            detachmentEnhancements.push(removedEnhancement);
        }
    }

    // Adjust indices for units after the removed one
    enhancementTracker.forEach(item => {
        if (item.unitIndex > index) {
            item.unitIndex -= 1;
        }
    });

    const response = await fetch("/api/remove-unit", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            unit_index: index
        })
    });

    const data = await response.json();
    currentArmy = data.army;
    sessionStorage.setItem('enhancementTracker', JSON.stringify(enhancementTracker));
    renderArmy(currentArmy, currentDetachment);
}

function updateEnhancements(unitIndex) {
    const select = document.getElementById(`enhancement-select-${unitIndex}`);
    if (!select) {
        return;
    }

    const selectedEnhancementId = select.value;

    const selectedEnhancement = detachmentEnhancements.find(enhancement => enhancement.id === selectedEnhancementId);
    if (!selectedEnhancement) {
        console.error("Selected enhancement not found:", selectedEnhancementId);
        return;
    }

    // Load enhancement content asynchronously
    getFileByPath(selectedEnhancement.path).then(content => {
        for (let i = 0; i < enhancementTracker.length; i++) {
            if (enhancementTracker[i].unitIndex === unitIndex) {
                const previousEnhancement = enhancementTracker[i].enhancement;
                detachmentEnhancements.push(previousEnhancement);
                enhancementTracker.splice(i, 1);
                break;
            }
        }
        enhancementTracker.push({"unitIndex" : unitIndex, "enhancement" : selectedEnhancement, "content": content});
        console.log("Selected enhancement for unit", unitIndex, selectedEnhancement);

        const deleteIndex = detachmentEnhancements.indexOf(selectedEnhancement);
        detachmentEnhancements.splice(deleteIndex, 1);

        console.log("Remaining enhancements:", detachmentEnhancements);
        sessionStorage.setItem('enhancementTracker', JSON.stringify(enhancementTracker));
        sessionStorage.setItem('detachmentEnhancements', JSON.stringify(detachmentEnhancements));
        renderArmy(currentArmy, currentDetachment);
    }).catch(error => {
        console.error("Failed to load enhancement content:", error);
    });
}

function removeEnhancement(unitIndex) {
    for (let i = 0; i < enhancementTracker.length; i++) {
        if (enhancementTracker[i].unitIndex === unitIndex) {
            const removedEnhancement = enhancementTracker[i].enhancement;
            enhancementTracker.splice(i, 1);
            if (detachmentEnhancements) {
                detachmentEnhancements.push(removedEnhancement);
            }
            break;
        }
    }
    sessionStorage.setItem('enhancementTracker', JSON.stringify(enhancementTracker));
    sessionStorage.setItem('detachmentEnhancements', JSON.stringify(detachmentEnhancements));
    renderArmy(currentArmy, currentDetachment);
}

async function getFileByPath(path) {
    const response = await fetch("/api/get-file-by-path", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            path: path
        })
    });
    const data = await response.json();
    return data.content;
}

// Initialize the application
loadArmy();