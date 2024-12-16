document.getElementById('btn-consultar').addEventListener('click', function() {
    // Mostrar mensaje de carga
    document.getElementById('loading').style.display = 'block';
    document.getElementById('result').style.display = 'none';

    // Verificar si el navegador soporta la geolocalización
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            // Obtener las coordenadas del GPS
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;
            // Mostrar el mensaje de "cargando"
            const resultDiv = document.getElementById('result');
            resultDiv.style.display = 'block';
            document.getElementById('loading').style.display = 'block';

            // Crear la URL con las coordenadas obtenidas
            const url = `https://aplicaciones.catastrotucuman.gov.ar/android/frmParcelageo.asp?tc=0&lat=${latitude}&lon=${longitude}&pad=0`;

            // Hacer la solicitud a la URL
            fetch(url)
                .then(response => response.text())
                .then(data => {
                    // Mostrar la respuesta en el resultado
                    document.getElementById('loading').style.display = 'none';
                    document.getElementById('result').style.display = 'block';
                    document.getElementById('result').innerHTML =  `<h3>El padron es:</h3><p>${data}</p>`;
                })
                .catch(error => {
                    document.getElementById('loading').style.display = 'none';
                    document.getElementById('result').style.display = 'block';
                    document.getElementById('result').innerHTML = `<p class="error">Error al obtener la información: ${error}</p>`;
                });

        }, function(error) {
            // En caso de error al obtener la geolocalización
            document.getElementById('loading').style.display = 'none';
            document.getElementById('result').style.display = 'block';
            document.getElementById('result').innerHTML = `<p class="error">No se pudo obtener la ubicación del GPS. Por favor, asegúrese de que los permisos están habilitados y que el GPS está activo.</p>`;
        }, {
            enableHighAccuracy: true,  // Asegura que se utilice el GPS si está disponible
            timeout: 10000,           // Tiempo de espera para obtener la ubicación
            maximumAge: 0             // No usar una ubicación en caché
        });
    } else {
        // Si el navegador no soporta la geolocalización
        document.getElementById('loading').style.display = 'none';
        document.getElementById('result').style.display = 'block';
        document.getElementById('result').innerHTML = `<p class="error">La geolocalización no está soportada por este navegador.</p>`;
    }
});
