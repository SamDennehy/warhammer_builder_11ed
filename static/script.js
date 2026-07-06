//faction handling functions
function submitFaction() {
    const factionSelect = document.getElementById('faction_select');
    const selectedFaction = factionSelect.value;

    if (selectedFaction) {
        get_faction_data(selectedFaction)
            .then(data => {
                console.log(data);
            });
    }

    const factionDataDiv = document.getElementById('faction_data');
    if (window.getComputedStyle(factionDataDiv).display === 'none') {
        factionDataDiv.style.display = 'block';
    }
}
async function get_faction_data(faction) {
    const response = await fetch('/get_faction_data', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ faction })
    });
    return response.json();
}