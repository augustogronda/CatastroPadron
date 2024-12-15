document.getElementById('btn-consultar').addEventListener('click', function () {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (position) {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;

            // Mostrar el mensaje de "cargando"
            const resultDiv = document.getElementById('result');
            resultDiv.style.display = 'block';
            document.getElementById('loading').style.display = 'block';

            // Realizar la consulta al catastro
            const url = `https://aplicaciones.catastrotucuman.gov.ar/android/frmParcelageo.asp?tc=0&lat=${lat}&lon=${lon}&pad=0`;

            fetch(url)
                .then(response => response.text())
                .then(data => {
                    // Mostrar la respuesta del catastro en la página
                    resultDiv.innerHTML = `<h3>El padron es:</h3><p>${data}</p>`;
                })
                .catch(error => {
                    console.error('Error al hacer la consulta:', error);
                    resultDiv.innerHTML = `<p class="error">Hubo un error al consultar la información. Intenta nuevamente.</p>`;
                });
        }, function (error) {
            console.error('Error al obtener la ubicación:', error);
            resultDiv.innerHTML = `<p class="error">No se pudo obtener la ubicación. Asegúrate de permitir el acceso a la ubicación.</p>`;
        });
    } else {
        resultDiv.innerHTML = `<p class="error">Tu navegador no soporta la geolocalización.</p>`;
    }
});