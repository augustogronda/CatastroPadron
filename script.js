// Declarar las variables en el ámbito global
let latitud;  
let longitud;

// Función compartida para ambos métodos de consulta
function fetchPadronData(padron) {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('result').style.display = 'none';

    const urlCoords = `https://aplicaciones.catastrotucuman.gov.ar/frmparcelageo.asp?txtpadron=${padron}`;

    fetch(urlCoords)
        .then(response => response.text())
        .then(coordsData => {
            const coordsMatch = coordsData.match(/(\d+\.\d+),(\d+\.\d+)/);
            if (!coordsMatch) {
                throw new Error('No se encontraron coordenadas en la respuesta.');
            }

            const este = parseFloat(coordsMatch[1]);
            const norte = parseFloat(coordsMatch[2]);

            // Asignar las coordenadas a las variables globales
            latitud = norte;  // Usar norte como latitud
            longitud = este;   // Usar este como longitud

            // Loguear las coordenadas
            console.log(`Latitud: ${latitud}, Longitud: ${longitud}`);

            const bbox = {
                xmin: este - 150,
                ymin: norte - 150,
                xmax: este + 150,
                ymax: norte + 150,
            };

            const width = 828;
            const height = 828;

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
                <button id="google-maps-button" class="google-maps-button">Ver en Google Maps</button>
                <button id="download-kml" class="download-kml" style="margin-top: 10px;">Descargar KML</button>
                <button id="editor-button" class="editor-button" style="margin-top: 10px;">Editor en Línea</button>
                <button id="padron-button" class="padron-button">Cerrar Padrón</button>
            `;

            // Configuración de eventos para los botones dinámicos
            let isMapShown = false;
            let isParcelShown = false;

            function closeAllContainers() {
                document.getElementById('map-container').style.display = 'none';
                document.getElementById('parcel-container').style.display = 'none';
                document.getElementById('result').style.display = 'none';
            }

            document.getElementById('padron-button').addEventListener('click', () => {
                closeAllContainers();
                document.getElementById('padron-button').textContent = 'Consultar Padrón';
            });

            document.getElementById('editor-button').addEventListener('click', () => {
                openEditorOnline(kmlDownload);
            });

            document.getElementById('map-button').addEventListener('click', () => {
                const mapContainer = document.getElementById('map-container');
                const mapButton = document.getElementById('map-button');

                if (!isMapShown) {
                    mapContainer.innerHTML = `<img src="${urlMapa}" alt="Mapa de la Parcela" style="max-width: 100%; border: 1px solid #ddd;"/>`;
                    mapContainer.style.display = 'block';
                    mapButton.textContent = 'Cerrar Mapa ';
                    isMapShown = true;
                } else {
                    mapContainer.style.display = 'none';
                    mapButton.textContent = 'Mostrar Mapa';
                    isMapShown = false;
                }
            });

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
                                // Loguear las coordenadas del KML
                                return [lat, lng];
                            });

                            parcelContainer.style.display = 'block';
                            parcelContainer.innerHTML = '<div id="map" style="height: 400px;"></div>';

                            const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                                attribution: '© OpenStreetMap contributors',
                                maxZoom: 21
                            });

                            const googleLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
                                attribution: '© Google',
                                maxZoom: 21
                            });

                            const map = L.map('map',).fitBounds(latlngs);
                            googleLayer.addTo(map);
                            map.setZoom(19);

                            L.control.layers({
                                'Google Satellite': googleLayer,
                                'OpenStreetMap': osmLayer,
                            }).addTo(map);

                            // Crear el polígono y calcular el área con turf.js
                            const polygon = L.polygon(latlngs, { color: 'red' }).addTo(map);
                            // Convertir a formato GeoJSON para turf (coordenadas [lng, lat])
                            const turfPolygon = turf.polygon([
                                latlngs.map(([lat, lng]) => [lng, lat])
                            ]);
                            const areaM2 = turf.area(turfPolygon);
                            const areaHa = areaM2 / 10000;
                            polygon.bindTooltip(`${areaHa.toFixed(2)} ha`, { permanent: true, direction: 'center', className: 'area-label' }).openTooltip();
                        })
                        .catch(error => {
                            console.error('Error al procesar el KML:', error);
                        });

                    parcelButton.textContent = 'Cerrar Mapa Satelital';
                    isParcelShown = true;
                } else {
                    parcelContainer.style.display = 'none';
                    parcelButton.textContent = 'Mostrar Parcela';
                    isParcelShown = false;
                }
            });

            document.getElementById('google-maps-button').addEventListener('click', () => {
                // Define the coordinate systems
                proj4.defs('EPSG:5345', '+proj=tmerc +lat_0=-90 +lon_0=-66 +k=1 +x_0=3500000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');
                proj4.defs('EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs');

                // Convert coordinates from EPSG:5345 to EPSG:4326
                const [wgs84Long, wgs84Lat] = proj4('EPSG:5345', 'EPSG:4326', [longitud, latitud]);

                // Modified URL to include a marker
                const googleMapsUrl = `https://www.google.com/maps?q=${wgs84Lat},${wgs84Long}&z=19`;
                window.open(googleMapsUrl, '_blank');
            });

            // Agregar el evento para el botón de descarga KML
            document.getElementById('download-kml').addEventListener('click', () => {
                window.location.href = kmlDownload;
            });

            document.getElementById('loading').style.display = 'none';
        })
        .catch(error => {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('result').innerHTML = `<p class="error">Error: ${error.message}</p>`;
            document.getElementById('result').style.display = 'block';
        });
}

function openEditorOnline(kmlUrl) {
    // Ocultar el contenedor principal
    document.querySelector('.container').style.display = 'none';
    
    // Crear el contenedor del editor
    const editorContainer = document.createElement('div');
    editorContainer.id = 'editor-container';
    
    // Crear el mapa
    const mapDiv = document.createElement('div');
    mapDiv.id = 'editor-map';
    editorContainer.appendChild(mapDiv);
    
    // Crear botón de regreso
    const backButton = document.createElement('button');
    backButton.className = 'editor-back-button';
    backButton.textContent = 'Volver';
    backButton.onclick = () => {
        document.body.removeChild(editorContainer);
        document.querySelector('.container').style.display = 'block';
    };
    editorContainer.appendChild(backButton);
    
    // Agregar el contenedor al body
    document.body.appendChild(editorContainer);
    
    // Inicializar MapViewer
    const mapViewer = new MapViewer({
        center: [latitud, longitud],
        zoom: 18,
        minZoom: 5,
        maxZoom: 21
    });
    
    // Inicializar el mapa
    mapViewer.init('editor-map', 'Google Satélite');
    
    // Mostrar la capa satelital por defecto
    if (mapViewer.baseLayers && mapViewer.baseLayers['Google Satellite']) {
        mapViewer.baseLayers['Google Satellite'].addTo(mapViewer.map);
    }
    
    // Cargar el KML
    fetch(kmlUrl)
        .then(response => response.text())
        .then(kmlText => {
            const parser = new DOMParser();
            const kmlDoc = parser.parseFromString(kmlText, 'text/xml');
            const coordinates = kmlDoc.getElementsByTagName('coordinates')[0].textContent.trim().split(' ');
            
            // Crear un array de puntos
            const points = coordinates.map(coord => {
                const [lng, lat] = coord.split(',');
                return [parseFloat(lat), parseFloat(lng)];
            });
            
            // Crear y agregar el polígono
            const polygon = L.polygon(points, {
                color: 'red',
                fillColor: '#f03',
                fillOpacity: 0.3
            }).addTo(mapViewer.map);
            
            // Centrar el mapa en el polígono
            mapViewer.map.fitBounds(polygon.getBounds());
        })
        .catch(error => console.error('Error al cargar el KML:', error));
}

// Consulta por geolocalización
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
                    const padron = data.trim();
                    fetchPadronData(padron);
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

// Consulta manual por padrón
document.getElementById('btn-consultar-manual').addEventListener('click', function () {
    const padron = document.getElementById('padron-input').value.trim();
    
    if (!padron) {
        alert('Por favor ingrese un número de padrón');
        return;
    }
    
    if (!/^\d+$/.test(padron)) {
        alert('El padrón debe contener solo números');
        return;
    }

    fetchPadronData(padron);
});

document.getElementById('editor-button').disabled = true;