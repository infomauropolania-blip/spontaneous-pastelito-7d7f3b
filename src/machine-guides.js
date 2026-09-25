(function (root) {
  const philipsClassicSteps = [
    'Enciende la cafetera, coloca una taza y selecciona Espresso.',
    'En «Mi elección de café», ajusta la intensidad del aroma y elige una de las tres cantidades de bebida.',
    'Para guardar una cantidad alta personalizada, mantén pulsado el icono de la bebida tres segundos; pulsa inicio/parada para preparar y vuelve a pulsarlo al llegar al volumen deseado.',
    'Si cambias la molienda, mueve el selector del depósito solo mientras muele. Cambia un punto y prueba varias tazas antes de volver a ajustar.'
  ];
  const philipsVolumeSource = 'https://www.philips.es/c-f/XC000004124/c%C3%B3mo-puedo-ajustar-el-volumen-de-las-bebidas-de-mi-cafetera-espresso-philips';
  const guides = [
    {
      id: 'delonghi-ecam21112b', brand: 'De’Longhi', model: 'Magnifica S ECAM21.112.B',
      steps: [
        'Enciende la cafetera y prepara un espresso para probar el punto de partida.',
        'Ajusta el sabor con el mando de aroma: hacia MAX aumenta la cantidad de café molido.',
        'Elige la cantidad de café en taza con los controles de la máquina y prueba antes de cambiar otra variable.',
        'Si ajustas el molinillo, mueve el selector solo mientras muele, un punto cada vez. El efecto se aprecia tras unas dos tazas.'
      ],
      note: 'La referencia debe indicar ECAM21.112.B. Otras Magnifica S pueden tener controles distintos.',
      source: 'https://www.delonghi.com/es-es/s/ECAM21.112.B'
    },
    {
      id: 'delonghi-ecam22110b', brand: 'De’Longhi', model: 'Magnifica S ECAM22.110.B',
      steps: [
        'Enciende la cafetera y selecciona Espresso para preparar una taza de prueba.',
        'Gira el selector manual de aroma para ajustar la intensidad del café; prueba una taza después del cambio.',
        'Ajusta la cantidad en taza con los controles de bebida según el manual de esta referencia.',
        'Si cambias el molinillo, gira el selector solo mientras muele, un punto cada vez, y valora el resultado tras dos tazas.'
      ],
      note: 'Esta guía corresponde a ECAM22.110.B, con botones y selector manual; confirma la referencia en la etiqueta.',
      source: 'https://www.delonghi.com/es-es/p/magnifica-s-cafetera-superautomatica-magnifica-s-ecam22.110.b/ECAM22.110.B.html?pid=0132213067'
    },
    {
      id: 'delonghi-ecam29081tb', brand: 'De’Longhi', model: 'Magnifica Evo ECAM290.81.TB EX:1',
      steps: [
        'Comprueba que la referencia de la etiqueta sea ECAM290.81.TB EX:1.',
        'Usa el panel táctil para elegir Espresso y preparar una taza de prueba.',
        'Consulta el manual de esta Magnifica Evo antes de cambiar el aroma, la cantidad en taza o la molienda: su panel no es el de la Magnifica S.'
      ],
      note: 'Modelo identificado; la secuencia detallada de ajustes aún está en preparación.',
      source: 'https://www.delonghi.com/es-es/p/magnifica-evo-cafetera-automatica-magnifica-evo-ecam290.81.tb-ex1/ECAM290.81.TB%2BEX%3A1.html?pid=0132250147',
      partial: true
    },
    {
      id: 'delonghi-ecam35055b', brand: 'De’Longhi', model: 'Dinamica ECAM350.55.B EX:4',
      steps: [
        'Comprueba que la referencia de la etiqueta sea ECAM350.55.B EX:4.',
        'Selecciona Espresso en su panel y prepara una taza para anotar el resultado.',
        'Consulta el manual oficial de esta Dinamica para localizar y ajustar aroma, cantidad en taza y molienda; no uses los controles de otra gama.'
      ],
      note: 'Modelo identificado; la guía detallada de sus controles aún está en preparación.',
      source: 'https://www.delonghi.com/es-es/s/ECAM350.55.B%20EX%3A4',
      partial: true
    },
    {
      id: 'cecotec-cube', brand: 'Cecotec', model: 'Cremmaet Cube A01_EU01_102811',
      steps: [
        'Enciende la cafetera y espera a que termine el enjuague. Selecciona Espresso o Espresso largo.',
        'Para guardar otra cantidad en taza, mantén pulsado el icono de la bebida durante la preparación y suéltalo al llegar a la cantidad deseada; dos pitidos confirman el ajuste.',
        'Si necesitas cambiar la molienda, mueve la rueda del depósito solo mientras el molinillo esté funcionando, un nivel cada vez.',
        'Prueba otra taza antes de seguir ajustando. Este modelo no tiene un control de intensidad independiente en el manual consultado.'
      ],
      note: 'Comprueba la referencia exacta bajo la máquina. Cambiar la rueda con el molinillo parado puede dañarla.',
      source: 'https://cdn.cecotec.cloud/media/files/cremmaet-cube_user_manual.pdf'
    },
    {
      id: 'cecotec-compact', brand: 'Cecotec', model: 'Cremmaet Compact A01_EU01_103806',
      steps: [
        'Enciende la cafetera y selecciona Espresso.',
        'Mientras muele y aparece «g», usa + o − para ajustar la cantidad de café molido.',
        'Durante la preparación, cuando aparece «ml», usa + o − para ajustar la cantidad de bebida.',
        'Cambia el selector del molinillo solo mientras esté funcionando y prueba una taza después de cada cambio.'
      ],
      note: 'Comprueba la referencia exacta. La cantidad de café y el volumen de bebida se ajustan en momentos distintos.',
      source: 'https://cdn.cecotec.cloud/media/files/cremmaet-commpact_user_manual.pdf'
    },
    {
      id: 'cecotec-latte', brand: 'Cecotec', model: 'Cremmaet Latte A01_EU01_115412',
      steps: [
        'Enciende la máquina, coloca una taza y toca el icono de Espresso.',
        'Durante la molienda, cuando la pantalla muestra «g», usa + o − para cambiar la cantidad de café molido.',
        'Durante la preparación, cuando la pantalla muestra «ml», usa + o − para cambiar la cantidad en taza.',
        'Si cambias la molienda, mueve el selector del depósito solo mientras el molinillo funciona; prueba otra taza antes de seguir.'
      ],
      note: 'En esta Latte, la cantidad de café y el volumen se ajustan en fases distintas de la preparación.',
      source: 'https://cdn.cecotec.cloud/media/files/cremmaet-latte_user_manual.pdf'
    },
    {
      id: 'cecotec-latte-touch', brand: 'Cecotec', model: 'Cremmaet Latte Touch A01_EU01_115413',
      steps: [
        'Enciende la máquina, coloca una taza y selecciona Espresso en la pantalla táctil.',
        'En la pantalla de parámetros de Espresso, ajusta la cantidad de bebida, la cantidad de café en grano y la temperatura con los controles táctiles.',
        'Guarda los parámetros con el icono de guardar y confirma, o inicia la preparación sin guardarlos.',
        'Para cambiar la molienda, mueve el selector solo mientras el molinillo está funcionando.'
      ],
      note: 'La Latte Touch tiene una pantalla de ajustes propia; no sigas los pasos de la Latte convencional.',
      source: 'https://cdn.cecotec.cloud/media/files/cremmaet-latte-touch_user_manual.pdf'
    },
    {
      id: 'cecotec-lungo-latte', brand: 'Cecotec', model: 'Cremmaet Lungo Latte A01_EU01_102810',
      steps: [
        'Enciende la máquina y espera al enjuague automático; coloca una taza bajo la salida.',
        'Pulsa el icono táctil de intensidad para elegir sabor suave, normal o fuerte y después selecciona Espresso.',
        'Para memorizar otra cantidad en taza, mantén pulsado el icono de la bebida durante la preparación y suéltalo al llegar al volumen deseado; dos pitidos confirman el ajuste.',
        'Si cambias la molienda, mueve el mando del depósito solo mientras el molinillo funciona.'
      ],
      note: 'La intensidad y el volumen usan controles distintos en esta Lungo Latte.',
      source: 'https://cdn.cecotec.cloud/media/files/cremmaet-lungo-latte_user_manual.pdf'
    },
    {
      id: 'philips-ep2224', brand: 'Philips', model: 'Serie 2200 EP2224/10',
      steps: philipsClassicSteps,
      note: 'Estas indicaciones corresponden a EP2224/10. Philips tiene otros paneles y controles según la serie.',
      source: 'https://www.philips.es/c-p/EP2224_10/series-2200-cafeteras-espresso-completamente-automaticas',
      extraSource: philipsVolumeSource
    },
    {
      id: 'philips-ep1224', brand: 'Philips', model: 'Serie 1200 EP1224/00',
      steps: philipsClassicSteps,
      note: 'Esta referencia figura en el manual conjunto de las series 1200, 2200 y 3200. Comprueba EP1224/00 en la etiqueta.',
      source: 'https://acc.philips.es/c-p/EP1224_00/series-1200-fully-automatic-espresso-machines/soporte',
      extraSource: philipsVolumeSource
    },
    {
      id: 'philips-ep2220', brand: 'Philips', model: 'Serie 2200 EP2220/10',
      steps: philipsClassicSteps,
      note: 'Esta referencia usa espumador de leche clásico; los pasos descritos son para preparar café solo.',
      source: 'https://www.philips.es/c-p/EP2220_10/series-2200-cafeteras-espresso-completamente-automaticas/soporte',
      extraSource: philipsVolumeSource
    },
    {
      id: 'philips-ep3221', brand: 'Philips', model: 'Serie 3200 EP3221/40',
      steps: philipsClassicSteps,
      note: 'Esta referencia figura en el manual conjunto de las series 1200, 2200 y 3200. Comprueba EP3221/40 en la etiqueta.',
      source: 'https://www.philips.es/c-p/EP3221_40/series-3200-cafeteras-espresso-completamente-automaticas/soporte',
      extraSource: philipsVolumeSource
    },
    {
      id: 'philips-ep3246', brand: 'Philips', model: 'Serie 3200 LatteGo EP3246/70',
      steps: philipsClassicSteps,
      note: 'Esta referencia incorpora LatteGo; los pasos descritos son para preparar café solo.',
      source: 'https://www.philips.es/c-p/EP3246_70/series-3200-cafeteras-espresso-completamente-automaticas/soporte',
      extraSource: philipsVolumeSource
    },
    {
      id: 'philips-ep2331', brand: 'Philips', model: 'Serie 2300 LatteGo EP2331/10',
      steps: [
        'Comprueba que la referencia de la etiqueta sea EP2331/10.',
        'Selecciona Espresso en su panel y prepara una taza para anotar el resultado.',
        'Consulta el manual de la Serie 2300 para ajustar intensidad, cantidad y molienda: este panel difiere del de las series 1200, 2200 y 3200.'
      ],
      note: 'Modelo identificado; la guía detallada de sus controles aún está en preparación.',
      source: 'https://www.philips.es/c-p/EP2331_10/cafetera-espresso-completamente-automatica-serie-2300/soporte',
      partial: true
    },
    {
      id: 'philips-ep3347', brand: 'Philips', model: 'Serie 3300 LatteGo EP3347/90',
      steps: [
        'Comprueba que la referencia de la etiqueta sea EP3347/90.',
        'Selecciona Espresso en su panel y prepara una taza para anotar el resultado.',
        'Consulta el manual de la Serie 3300 para ajustar intensidad, cantidad y molienda: no uses los pasos de otro panel Philips.'
      ],
      note: 'Modelo identificado; la guía detallada de sus controles aún está en preparación.',
      source: 'https://acc.philips.es/c-p/EP3347_90/cafetera-espresso-completamente-automatica-serie-3300/soporte',
      partial: true
    },
    {
      id: 'philips-ep5444', brand: 'Philips', model: 'Serie 5400 EP5444/50',
      steps: [
        'Comprueba que la referencia de la etiqueta sea EP5444/50.',
        'Selecciona Espresso en su pantalla y prepara una taza para anotar el resultado.',
        'Consulta el manual de la Serie 5400 para los controles de intensidad, cantidad y molienda: no uses la secuencia de botones de la Serie 2200.'
      ],
      note: 'Modelo identificado; la guía detallada de sus controles aún está en preparación.',
      source: 'https://www.philips.es/c-p/EP5444_50/philips-5400-series-cafeteras-espresso-completamente-automaticas/soporte',
      partial: true
    },
    {
      id: 'melitta-solo', brand: 'Melitta', model: 'Solo 6708702_ES',
      steps: [
        'Enciende la cafetera y prepara un café para comprobar el sabor.',
        'Elige la intensidad con el botón de los granos: tiene tres niveles.',
        'Ajusta la cantidad de café con el regulador de agua: hacia la izquierda sale menos y hacia la derecha, más.',
        'Para cambiar la molienda, abre la cubierta lateral derecha y sigue la indicación de Melitta para el ajuste durante una preparación. Cambia un nivel y vuelve a probar.'
      ],
      note: 'La gama Solo tiene variantes. Comprueba la referencia antes de seguir estos controles.',
      source: 'https://www.melitta.es/solo'
    },
    {
      id: 'siemens-eq500', brand: 'Siemens', model: 'EQ500 TP503R09',
      steps: [
        'Enciende la cafetera y selecciona Espresso en el panel.',
        'Antes de preparar, ajusta en la bebida la intensidad y el tamaño de la taza; empieza por un valor medio y prueba.',
        'Si cambias la molienda, gira el mando solo mientras muele. Haz un cambio pequeño y espera hasta la segunda taza para valorar el efecto.'
      ],
      note: 'Guía basada en los ajustes publicados para la familia EQ500. Confirma que la referencia de tu máquina es TP503R09.',
      source: 'https://www.siemens-home.bsh-group.com/es/servicio-oficial/limpieza-mantenimiento/cafeteras/eq500/configuracion/'
    },
    {
      id: 'bosch-tie20119', brand: 'Bosch', model: 'VeroCafe Serie 2 TIE20119/02',
      steps: [
        'Comprueba en la etiqueta que la referencia es TIE20119/02.',
        'Enciende la cafetera y prepara un café con la selección de bebida del panel para anotar el resultado.',
        'Consulta el manual oficial de esta referencia antes de cambiar intensidad, cantidad o molienda: la guía detallada de controles aún está en preparación.'
      ],
      note: 'Ficha identificada; todavía no hay pasos de ajuste específicos verificados para este panel.',
      source: 'https://www.bosch-home.es/es/productservice/TIE20119-02',
      partial: true
    },
    {
      id: 'krups-ea815070', brand: 'Krups', model: 'Essential EA815070',
      steps: [
        'Enciende la cafetera y prepara un espresso de prueba.',
        'Si el café sale muy despacio, ajusta la rueda del depósito hacia una molienda más gruesa. Si sale flojo, prueba un ajuste más fino.',
        'Mueve la rueda de molienda solo mientras funciona el molinillo y cambia una muesca cada vez.',
        'Prueba de nuevo y ajusta la cantidad de bebida según el panel y el manual de tu referencia.'
      ],
      note: 'Confirma la referencia EA815070; otras Essential pueden tener paneles diferentes.',
      source: 'https://www.krups.es/instrucciones-de-uso/csp/8000035172'
    },
    {
      id: 'jura-ena4', brand: 'Jura', model: 'ENA 4 EA 15344',
      steps: [
        'Enciende la cafetera, coloca una taza y selecciona Espresso o Café.',
        'Para la intensidad, pulsa el botón de intensidad una vez para suave, dos para normal o tres para fuerte antes o durante la molienda.',
        'La cantidad de agua se puede programar para cada bebida. Consulta el apartado de programación del manual de esta ENA 4 antes de modificarla.',
        'Si cambias la molienda, sigue el apartado de ajuste del mecanismo del manual y prueba una taza antes de volver a cambiar.'
      ],
      note: 'La ENA 4 tiene varias generaciones. Confirma la variante EA y la referencia antes de seguir los botones.',
      source: 'https://is.jura.com/-/media/global/pdf/manuals-global/home/ENA/ENA-4/download_manual_ena4.pdf?la=es&sc_lang=es'
    },
    {
      id: 'nivona-nicr550', brand: 'Nivona', model: 'CafeRomatica NICR 550',
      steps: [
        'Enciende la cafetera y elige Espresso o Café para hacer una taza de prueba.',
        'Este modelo permite tres niveles de intensidad y ajustar la cantidad de bebida en taza.',
        'La molienda también es regulable. Antes de mover el selector, consulta el manual de la NICR 550 para localizar el mando y el momento correcto de ajuste.',
        'Cambia un ajuste cada vez y vuelve a probar el café.'
      ],
      note: 'Características verificadas en la ficha oficial; los pasos exactos del panel todavía están en preparación.',
      source: 'https://nivona.com/assets/Data%20Sheet%20NICR%20550%20%28GB%29-DRY03xf2.pdf',
      partial: true
    }
  ];

  const normalize = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const search = (query) => {
    const needle = normalize(query);
    return needle ? guides.filter((guide) => normalize(`${guide.brand} ${guide.model}`).includes(needle)) : guides;
  };
  const exact = (query) => {
    const needle = normalize(query);
    return guides.find((guide) => needle === normalize(`${guide.brand} ${guide.model}`) || needle === normalize(guide.model)) || null;
  };

  root.PepposMachines = { guides, search, exact };
  if (typeof module !== 'undefined') module.exports = root.PepposMachines;
})(typeof window !== 'undefined' ? window : globalThis);
