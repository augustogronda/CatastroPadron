// Clase principal del visor de mapa
class MapViewer {
    constructor(options = {}) {
        this.options = {
            center: [-26.757886548112566, -65.23849401687397],
            zoom: 18,
            minZoom: 0,
            maxZoom: 21,
            ...options
        };
        
        this.map = null;
        this.drawnItems = null;
        this.shapefileLayers = {};
        this.shpLayersVisible = true;
        this.currentKmlUrl = null;
        
        // Definir la proyección POSGAR 2007 Argentina Zone 3
        proj4.defs("EPSG:5347", "+proj=tmerc +lat_0=-90 +lon_0=-66 +k=1 +x_0=3500000 +y_0=0 +ellps=WGS84 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");
    }

    // Inicializar el mapa
    init(containerId, defaultBaseLayer = 'OpenStreetMap') {
        // Base layers
        this.osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> colaboradores',
            minZoom: 0,
            maxZoom: 21
        });

        this.googleEarth = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
            attribution: '© Google',
            minZoom: 0,
            maxZoom: 21
        });

        // Seleccionar la capa base por defecto
        let baseLayer;
        if (defaultBaseLayer === 'Google Satélite') {
            baseLayer = this.googleEarth;
        } else {
            baseLayer = this.osm;
        }

        // Crear el mapa
        this.map = L.map(containerId, {
            center: this.options.center,
            zoom: this.options.zoom,
            minZoom: this.options.minZoom,
            maxZoom: this.options.maxZoom,
            layers: [baseLayer]
        });

        // Capa para los elementos dibujados
        this.drawnItems = new L.FeatureGroup();
        this.map.addLayer(this.drawnItems);

        // Configurar las capas base
        this.basemaps = {
            "OpenStreetMap": this.osm,
            "Google Satélite": this.googleEarth
        };

        // Configurar los overlays (sin ortofoto)
        this.generalOverlays = {
            "Dibujos": this.drawnItems
        };

        // Agregar control de capas
        this.generalLayersControl = L.control.layers(this.basemaps, this.generalOverlays, {
            collapsed: false,
            position: 'topright'
        }).addTo(this.map);

        // Configurar herramientas de dibujo
        this.setupDrawingTools();
        
        // Configurar herramienta de medición
        this.setupMeasurementTool();
        
        // Configurar visualización de coordenadas
        this.setupCoordinatesDisplay();
        
        // Configurar controles móviles
        this.setupMobileControls();
        
        // Cargar shapefiles
        // this.loadAllShapefiles();
    }

    // Configurar herramientas de dibujo
    setupDrawingTools() {
        // Crear el ícono personalizado como SVG
        const crossIcon = L.divIcon({
            className: '',
            html: `
                <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="20" cy="20" r="18" stroke="#ff0000" stroke-width="2" fill="none" />
                    <line x1="20" y1="4" x2="20" y2="36" stroke="#ff0000" stroke-width="2" />
                    <line x1="4" y1="20" x2="36" y2="20" stroke="#ff0000" stroke-width="2" />
                    <circle cx="20" cy="20" r="4" fill="#ff0000" />
                </svg>
            `,
            iconSize: [40, 40],
            iconAnchor: [20, 20],
            popupAnchor: [0, -20]
        });

        // Configurar las herramientas de dibujo
        const drawControl = new L.Control.Draw({
            position: 'topleft',
            draw: {
                rectangle: false,
                circle: false,
                circlemarker: false,
                marker: {
                    draggable: true,
                    icon: crossIcon
                }
            },
            edit: {
                featureGroup: this.drawnItems,
                remove: true,
                edit: {
                    selectedPathOptions: {
                        maintainColor: true,
                        dashArray: '10, 10'
                    }
                }
            }
        });
        this.map.addControl(drawControl);

        // Eventos de dibujo
        this.map.on('draw:created', (e) => this.handleDrawCreated(e));
        this.map.on('draw:edited', (e) => this.handleDrawEdited(e));
        this.map.on('draw:deleted', (e) => this.handleDrawDeleted(e));
    }

    // Configurar herramienta de medición
    setupMeasurementTool() {
        var measureControl = new L.Control.Measure({
            position: 'topleft',
            primaryLengthUnit: 'meters',
            secondaryLengthUnit: 'kilometers',
            primaryAreaUnit: 'sqmeters',
            secondaryAreaUnit: 'hectares',
            localization: 'es',
            activeColor: '#3388ff',
            completedColor: '#27ae60',
            popupOptions: {
                className: 'leaflet-measure-resultpopup',
                autoPanPadding: [10, 10]
            },
            units: {
                meters: {
                    factor: 1,
                    display: 'm',
                    decimals: 2
                },
                kilometers: {
                    factor: 0.001,
                    display: 'km',
                    decimals: 4
                },
                sqmeters: {
                    factor: 1,
                    display: 'm²',
                    decimals: 2
                },
                hectares: {
                    factor: 0.0001,
                    display: 'ha',
                    decimals: 4
                }
            },
            language: {
                measure: 'Medir',
                measureDistances: 'Medir distancias',
                measureArea: 'Medir área',
                start: 'Haga clic para comenzar a medir',
                cont: 'Haga clic para continuar midiendo',
                end: 'Doble clic para terminar',
                area: 'Área',
                distance: 'Distancia',
                total: 'Total',
                add: 'Agregar punto',
                clear: 'Limpiar',
                finish: 'Terminar',
                units: 'Unidades',
                tooltip: 'Medir distancia o área',
                tooltipButton: 'Medir',
                tooltipButtonTitle: 'Herramienta de medición',
                tooltipButtonActive: 'Herramienta de medición activa',
                tooltipButtonInactive: 'Herramienta de medición inactiva'
            }
        });
        this.map.addControl(measureControl);
    }

    // Configurar visualización de coordenadas
    setupCoordinatesDisplay() {
        const coordsDiv = document.getElementById('coords');
        if (coordsDiv) {
            this.map.on('mousemove', (e) => {
                const lat = e.latlng.lat;
                const lng = e.latlng.lng;
                const posgar = proj4("EPSG:4326", "EPSG:5347", [lng, lat]);
                
                coordsDiv.innerHTML = 'Lat: ' + lat.toFixed(6) + ', Lng: ' + lng.toFixed(6) + 
                                    '<br>POSGAR 07: X: ' + posgar[0].toFixed(2) + ', Y: ' + posgar[1].toFixed(2);
            });
        }
    }

    // Configurar controles móviles
    setupMobileControls() {
        const toggleLayersBtn = document.getElementById('toggle-layers-btn');
        if (toggleLayersBtn) {
            toggleLayersBtn.onclick = () => this.toggleLayersControl();
            window.addEventListener('resize', () => this.checkMobileLayersBtn());
            window.addEventListener('DOMContentLoaded', () => this.checkMobileLayersBtn());
        }
    }

    // Cargar shapefiles
    async loadAllShapefiles() {
        try {
            const response = await fetch('shp/lista.json');
            const lista = await response.json();

            for (const baseName of lista) {
                const shpPath = `shp/${baseName}.shp`;
                const dbfPath = `shp/${baseName}.dbf`;

                try {
                    await this.loadShapefileLayer(shpPath, dbfPath, baseName);
                    console.log(`Capa "${baseName}" cargada correctamente`);
                } catch (error) {
                    console.error(`Error al cargar la capa "${baseName}":`, error);
                }
            }
        } catch (error) {
            console.error('Error al cargar los shapefiles:', error);
        }
    }

    // Cargar un shapefile individual
    async loadShapefileLayer(shpPath, dbfPath, layerName) {
        const [shpBuffer, dbfBuffer] = await Promise.all([
            fetch(shpPath).then(response => response.arrayBuffer()),
            fetch(dbfPath).then(response => response.arrayBuffer())
        ]);

        const shpBlob = new Blob([shpBuffer], { type: 'application/octet-stream' });
        const dbfBlob = new Blob([dbfBuffer], { type: 'application/octet-stream' });
        
        const shpUrl = URL.createObjectURL(shpBlob);
        const dbfUrl = URL.createObjectURL(dbfBlob);
        
        const geojson = await shp(shpUrl);
        
        URL.revokeObjectURL(shpUrl);
        URL.revokeObjectURL(dbfUrl);

        const layer = L.featureGroup();
        
        geojson.features.forEach(feature => {
            if (feature.geometry.type === 'Point') {
                const coordinates = feature.geometry.coordinates;
                const wgs84Coords = proj4("EPSG:5347", "EPSG:4326", coordinates);
                
                const marker = L.marker([wgs84Coords[1], wgs84Coords[0]]);
                
                let popupContent = '<div>';
                for (let prop in feature.properties) {
                    popupContent += `<strong>${prop}:</strong> ${feature.properties[prop]}<br>`;
                }
                popupContent += `<br><strong>Coordenadas originales (POSGAR 07):</strong><br>`;
                popupContent += `X: ${coordinates[0].toFixed(2)}, Y: ${coordinates[1].toFixed(2)}<br>`;
                popupContent += `<strong>Coordenadas convertidas (WGS84):</strong><br>`;
                popupContent += `Lat: ${wgs84Coords[1].toFixed(6)}, Lng: ${wgs84Coords[0].toFixed(6)}`;
                popupContent += '</div>';
                marker.bindPopup(popupContent);
                
                layer.addLayer(marker);
            }
        });
        
        this.shapefileLayers[layerName] = layer;
        
        if (layerName.includes('Casa1') || layerName.includes('casa-7')) {
            this.map.addLayer(layer);
        }
        
        this.updateShapefileLayersControl();
        return layer;
    }

    // Actualizar control de capas de shapefiles
    updateShapefileLayersControl() {
        if (this.shapefileLayersControl) {
            this.map.removeControl(this.shapefileLayersControl);
        }
        
        this.shapefileLayersControl = L.control.layers({}, this.shapefileLayers, {
            collapsed: false,
            position: 'topright'
        });
        
        this.shapefileLayersControl.addTo(this.map);
        
        const controls = document.getElementsByClassName('leaflet-control-layers');
        if (controls.length > 1) {
            controls[controls.length - 1].classList.add('shp-layers-control');
        }
    }

    // Manejadores de eventos de dibujo
    handleDrawCreated(e) {
        const layer = e.layer;
        
        if (e.layerType === 'marker') {
            const lat = layer.getLatLng().lat;
            const lng = layer.getLatLng().lng;
            const posgar = proj4("EPSG:4326", "EPSG:5347", [lng, lat]);
            
            layer.bindPopup(
                'Coordenadas:<br>' +
                'Lat: ' + lat.toFixed(6) + '<br>' +
                'Lng: ' + lng.toFixed(6) + '<br>' +
                'POSGAR 07:<br>' +
                'X: ' + posgar[0].toFixed(2) + '<br>' +
                'Y: ' + posgar[1].toFixed(2)
            );

            layer.on('dragend', (e) => {
                const marker = e.target;
                const lat = marker.getLatLng().lat;
                const lng = marker.getLatLng().lng;
                const posgar = proj4("EPSG:4326", "EPSG:5347", [lng, lat]);
                
                marker.setPopupContent(
                    'Coordenadas:<br>' +
                    'Lat: ' + lat.toFixed(6) + '<br>' +
                    'Lng: ' + lng.toFixed(6) + '<br>' +
                    'POSGAR 07:<br>' +
                    'X: ' + posgar[0].toFixed(2) + '<br>' +
                    'Y: ' + posgar[1].toFixed(2)
                );
            });
        }
        
        this.drawnItems.addLayer(layer);
        this.updateExportCoordsBtn();
        this.updateMarkerNumbers();
    }

    handleDrawEdited(e) {
        const layers = e.layers;
        layers.eachLayer((layer) => {
            if (layer instanceof L.Marker) {
                const lat = layer.getLatLng().lat;
                const lng = layer.getLatLng().lng;
                const posgar = proj4("EPSG:4326", "EPSG:5347", [lng, lat]);
                
                layer.setPopupContent(
                    'Coordenadas:<br>' +
                    'Lat: ' + lat.toFixed(6) + '<br>' +
                    'Lng: ' + lng.toFixed(6) + '<br>' +
                    'POSGAR 07:<br>' +
                    'X: ' + posgar[0].toFixed(2) + '<br>' +
                    'Y: ' + posgar[1].toFixed(2)
                );
            }
        });
        this.updateExportCoordsBtn();
        this.updateMarkerNumbers();
    }

    handleDrawDeleted(e) {
        this.updateExportCoordsBtn();
        this.updateMarkerNumbers();
    }

    // Funciones de utilidad
    updateExportCoordsBtn() {
        const exportCoordsBtn = document.getElementById('export-coords');
        if (exportCoordsBtn) {
            let hasMarkers = false;
            this.drawnItems.eachLayer((layer) => {
                if (layer instanceof L.Marker) hasMarkers = true;
            });
            exportCoordsBtn.style.display = hasMarkers ? 'block' : 'none';
        }
    }

    updateMarkerNumbers() {
        this.map.eachLayer((layer) => {
            if (layer instanceof L.Marker && layer.options.icon && layer.options.icon.options.className === 'marker-number-label') {
                this.map.removeLayer(layer);
            }
        });
        
        let idx = 1;
        this.drawnItems.eachLayer((layer) => {
            if (layer instanceof L.Marker) {
                const numberIcon = L.divIcon({
                    className: 'marker-number-label',
                    html: '<div style="color:#fff;background:#3388ff;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-weight:bold;border:2px solid #fff;box-shadow:0 0 4px #0003;">'+idx+'</div>',
                    iconSize: [20, 20],
                    iconAnchor: [-10, 10]
                });
                const label = L.marker(layer.getLatLng(), {icon: numberIcon, interactive: false});
                label.addTo(this.map);
                layer._numberLabel = label;
                layer._number = idx;
                idx++;
            }
        });
    }

    toggleLayersControl() {
        const layersControl = document.querySelectorAll('.leaflet-control-layers');
        layersControl.forEach((ctrl) => {
            if (ctrl.classList.contains('mobile-visible')) {
                ctrl.classList.remove('mobile-visible');
            } else {
                ctrl.classList.add('mobile-visible');
            }
        });
    }

    checkMobileLayersBtn() {
        const btn = document.getElementById('toggle-layers-btn');
        const layersControl = document.querySelectorAll('.leaflet-control-layers');
        
        if (window.innerWidth <= 600) {
            if (btn) btn.style.display = 'flex';
            layersControl.forEach((ctrl) => {
                ctrl.classList.remove('mobile-visible');
            });
        } else {
            if (btn) btn.style.display = 'none';
            layersControl.forEach((ctrl) => {
                ctrl.style.visibility = '';
                ctrl.style.left = '';
                ctrl.style.top = '';
                ctrl.classList.remove('mobile-visible');
            });
        }
    }

    // Métodos públicos
    exportCoordsTXT() {
        const lines = [];
        let idx = 1;
        
        this.drawnItems.eachLayer((layer) => {
            if (layer instanceof L.Marker) {
                const lat = layer.getLatLng().lat;
                const lng = layer.getLatLng().lng;
                const posgar = proj4("EPSG:4326", "EPSG:5347", [lng, lat]);
                lines.push(
                    'Punto ' + idx + ': Lat: ' + lat.toFixed(6) + ', Lng: ' + lng.toFixed(6) +
                    ' | POSGAR 07 X: ' + posgar[0].toFixed(2) + ', Y: ' + posgar[1].toFixed(2)
                );
                idx++;
            }
        });
        
        if (lines.length === 0) {
            alert('No hay marcadores para exportar.');
            return;
        }
        
        const blob = new Blob([lines.join('\n')], {type: 'text/plain;charset=utf-8'});
        saveAs(blob, 'coordenadas_marcadores.txt');
    }

    toggleAllShpLayers() {
        this.shpLayersVisible = !this.shpLayersVisible;
        for (const key in this.shapefileLayers) {
            if (this.shapefileLayers.hasOwnProperty(key)) {
                if (this.shpLayersVisible) {
                    this.map.addLayer(this.shapefileLayers[key]);
                } else {
                    this.map.removeLayer(this.shapefileLayers[key]);
                }
            }
        }
        const btn = document.getElementById('toggle-shp-layers-btn');
        if (btn) {
            btn.innerText = this.shpLayersVisible ? 'Ocultar todas las casas' : 'Mostrar todas las casas';
        }
    }
}

// Exportar la clase para uso externo
window.MapViewer = MapViewer; 