document.getElementById('btn-consultar').addEventListener('click', function () {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('result').style.display = 'none';

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (position) {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;

            const urlPadron = `https://aplicaciones.catastrotucuman.gov.ar/android/frmParcelageo.asp?tc=0&lat=${latitude}&lon=${longitude}&pad=0`;

            fetch(urlPadron)
                .then(response => response.text())
                .then(data => {
                    document.getElementById('loading').style.display = 'none';
                    const padron = data.trim();

                    const urlCoords = `https://aplicaciones.catastrotucuman.gov.ar/frmparcelageo.asp?txtpadron=${padron}`;
                    return fetch(urlCoords).then(response => response.text()).then(coordsData => ({ padron, coordsData }));
                })
                .then(({ padron, coordsData }) => {
                    const coordsMatch = coordsData.match(/(\d+\.\d+),(\d+\.\d+)/);
                    if (!coordsMatch) {
                        throw new Error('No se encontraron coordenadas en la respuesta.');
                    }

                    const este = parseFloat(coordsMatch[1]);
                    const norte = parseFloat(coordsMatch[2]);

                    const bbox = {
                        xmin: este - 800,
                        ymin: norte - 800,
                        xmax: este + 800,
                        ymax: norte + 800,
                    };

                    // Obtener dimensiones de la pantalla
                    const width = 828;
                    const height = 1792;

                    const urlMapa = `https://mapas.catastrotucuman.gov.ar/geoserver/dgct/wms?LAYERS=dgct%3Acalles,dgct%3APARCELASR&STYLES=&FORMAT=image%2Fpng&TRANSPARENT=TRUE&WRAPDATELINE=true&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&SRS=EPSG%3A5345&BBOX=${bbox.xmin},${bbox.ymin},${bbox.xmax},${bbox.ymax}&WIDTH=${width}&HEIGHT=${height}`;

                    const resultDiv = document.getElementById('result');
                    resultDiv.style.display = 'block';
                    resultDiv.innerHTML = `
                        <h3>Resultado de la Consulta</h3>
                        <p><strong>Padrón:</strong> ${padron}</p>
                        <button id="map-button" class="map-button">Abrir Mapa</button>
                    `;

                    // Añadir funcionalidad al botón para abrir el mapa en una nueva pestaña
                    document.getElementById('map-button').addEventListener('click', () => {
                        window.open(urlMapa, '_blank');
                    });
                })
                .catch(error => {
                    document.getElementById('loading').style.display = 'none';
                    document.getElementById('result').innerHTML = `<p class="error">Error: ${error.message}</p>`;
                });
        }, function (error) {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('result').innerHTML = `<p class="error">No se pudo obtener la ubicación: ${error.message}</p>`;
        });
    } else {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('result').innerHTML = `<p class="error">La geolocalización no está soportada por este navegador.</p>`;
    }
});
