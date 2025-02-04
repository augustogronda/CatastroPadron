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
                        xmin: este - 150,
                        ymin: norte - 150,
                        xmax: este + 150,
                        ymax: norte + 150,
                    };

                    const width = 828;
                    const height = 1792;

                    const urlMapa = `https://mapas.catastrotucuman.gov.ar/geoserver/dgct/wms?LAYERS=dgct%3Acalles,dgct%3APARCELASR&STYLES=&FORMAT=image%2Fpng&TRANSPARENT=TRUE&WRAPDATELINE=true&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&SRS=EPSG%3A5345&BBOX=${bbox.xmin},${bbox.ymin},${bbox.xmax},${bbox.ymax}&WIDTH=${width}&HEIGHT=${height}`;

                    const kmlDownload = `https://aplicaciones.catastrotucuman.gov.ar/kml.asp?txtpadron=${padron}`;

                    const resultDiv = document.getElementById('result');
                    resultDiv.style.display = 'block';
                    resultDiv.innerHTML = `
                        <h3>Resultado de la Consulta</h3>
                        <p><strong>Padrón:</strong> ${padron}</p>
                        <button id="map-button" class="map-button">Mapa Catastro</button>
                        <div id="map-container" style="margin-top: 15px; display: none;"></div>
                        <button id="parcel-button" class="parcel-button" style="margin-top: 10px;">Mapa Satelital</button>
                        <div id="parcel-container" style="margin-top: 15px; display: none;"></div>
                        <button id="padron-button" class="padron-button">Cerrar Padrón</button>
                    `;
                    // le saque el boton descargar kml que iba arriba de cerrar padron  <button id="kml-button" class="kml-button" style="margin-top: 10px;">Descargar KML</button>
                    let isMapShown = false;
                    let isParcelShown = false;

                    // Función para ocultar todos los contenedores
                    function closeAllContainers() {
                        document.getElementById('map-container').style.display = 'none';
                        document.getElementById('parcel-container').style.display = 'none';
                        document.getElementById('result').style.display = 'none';
                    }

                    document.getElementById('padron-button').addEventListener('click', () => {
                        closeAllContainers(); // Cerrar todos los contenedores
                        document.getElementById('padron-button').textContent = 'Consultar Padrón'; // Cambiar el texto a "Consultar"
                    });

                    document.getElementById('map-button').addEventListener('click', () => {
                        const mapContainer = document.getElementById('map-container');
                        const mapButton = document.getElementById('map-button');

                        if (!isMapShown) {
                            mapContainer.innerHTML = `<img src="${urlMapa}" alt="Mapa de la Parcela" style="max-width: 100%; border: 1px solid #ddd;"/>`;
                            mapContainer.style.display = 'block';
                            mapButton.textContent = 'Cerrar Mapa';
                            isMapShown = true;
                        } else {
                            mapContainer.style.display = 'none';
                            mapButton.textContent = 'Mostrar Mapa';
                            isMapShown = false;
                        }
                    });

                    // document.getElementById('kml-button').addEventListener('click', () => {
                    //     const link = document.createElement('a');
                    //     link.href = kmlDownload;
                    //     link.download = `padron_${padron}.kml`;
                    //     document.body.appendChild(link);
                    //     link.click();
                    //     document.body.removeChild(link);
                    // });

                    document.getElementById('parcel-button').addEventListener('click', () => {
                        const parcelContainer = document.getElementById('parcel-container');
                        const parcelButton = document.getElementById('parcel-button');

                        if (!isParcelShown) {
                            fetch(kmlDownload)
                                .then(response => response.text())
                                .then(kmlText => {
                                    const parser = new DOMParser();
                                    const kml = parser.parseFromString(kmlText, 'text/xml');
                                    const coords = kml.getElementsByTagName('coordinates')[0].textContent.trim().split(' ');

                                    const latlngs = coords.map(coord => {
                                        const [lng, lat] = coord.split(',').map(Number);
                                        return [lat, lng];
                                    });

                                    parcelContainer.style.display = 'block';
                                    parcelContainer.innerHTML = '<div id="map" style="height: 400px;"></div>';

                                    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                                        attribution: '© OpenStreetMap contributors'
                                    });

                                    const googleLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
                                        attribution: '© Google'
                                    });

                                    const map = L.map('map').fitBounds(latlngs);
                                    googleLayer.addTo(map);

                                    L.control.layers({
                                        'Google Satellite': googleLayer,
                                        'OpenStreetMap': osmLayer,
                                    }).addTo(map);

                                    L.polygon(latlngs, { color: 'red' }).addTo(map);
                                })
                                .catch(error => {
                                    console.error('Error al procesar el KML:', error);
                                });

                            parcelButton.textContent = 'Cerrar Parcela';
                            isParcelShown = true;
                        } else {
                            parcelContainer.style.display = 'none';
                            parcelButton.textContent = 'Mostrar Parcela';
                            isParcelShown = false;
                        }
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
