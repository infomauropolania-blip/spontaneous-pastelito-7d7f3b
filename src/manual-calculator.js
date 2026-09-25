(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.PepposManual = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const methods = {
    ristretto: {
      name: 'Ristretto', kind: 'espresso', lead: 'Un espresso corto para explorar concentración y textura.',
      metrics: ['18 g de café', '27 g en taza', 'Ratio 1:1,5'],
      steps: ['Pesa la dosis y distribuye el café de manera uniforme.', 'Extrae 27 g de bebida a partir de 18 g de café como primer ensayo.', 'Prueba el sabor y ajusta molienda o rendimiento en pequeñas etapas.'],
      note: 'La referencia describe el ristretto como una bebida más corta, cercana a 1:1,5. Es un punto de partida editable: prueba la taza antes de decidir si está bien calibrada.',
      source: 'https://sca.coffee/sca-news/25/issue-9/english/water-and-coffee-acidity-how-to-adapt-your-water-for-different-extraction-methods-25-magazine-issue-9-pxjby',
      ratio: 1.5
    },
    espresso: {
      name: 'Espresso', kind: 'espresso', lead: 'Punto de partida clásico, siempre ajustable al café y al gusto.',
      metrics: ['18 g de café', '36 g en taza', 'Ratio 1:2'],
      steps: ['Muele y pesa 18 g de café; distribuye y compacta de forma uniforme.', 'Extrae aproximadamente 36 g de bebida.', 'Prueba la taza y registra dosis, peso final y tiempo antes de ajustar.'],
      note: 'La SCA observó el ratio 1:2 como promedio, no como una receta obligatoria. Úsalo como punto de partida y decide los ajustes después de probar la taza.',
      source: 'https://sca.coffee/sca-news/25-magazine/issue-3/defining-ever-changing-espresso-25-magazine-issue-3-zyx36',
      ratio: 2
    },
    v60: {
      name: 'V60', kind: 'filter', lead: 'Una taza limpia con vertido controlado y receta fácil de repetir.',
      metrics: ['15 g de café', '250 g de agua', 'Molienda media-fina'],
      steps: ['Coloca y enjuaga el filtro.', 'Añade 15 g de café y humedece todo el lecho con unos 50 g de agua.', 'Completa el vertido hasta 250 g; prueba la taza y anota el tiempo.'],
      note: 'Hario presenta unos 3 minutos como referencia aproximada y recomienda dar prioridad al sabor.',
      source: 'https://www.hario-usa.com/blogs/recipes-and-more-from-friends/james-hoffmann-1-cup-v60-technique',
      filterMethod: 'v60'
    },
    chemex: {
      name: 'Chemex', kind: 'filter', lead: 'Preparación de vertido con filtro grueso y molienda media-gruesa.',
      metrics: ['30 g de café', '500 g de agua', 'Molienda media-gruesa'],
      steps: ['Coloca el filtro con el lado de tres capas hacia el pico para dejar libre el canal de aire.', 'Añade el café y humedécelo por completo.', 'Vierte el resto del agua con ritmo estable y prueba la taza.'],
      note: 'Los 30 g y 500 g son un ejemplo editable de Peppos; el fabricante no prescribe esa cifra exacta.',
      source: 'https://chemexcoffeemaker.com/pages/faq', filterMethod: 'chemex'
    },
    siphon: {
      name: 'Sifón', kind: 'filter', lead: 'Método de inmersión y filtrado: repite contacto y agitación para comparar.',
      metrics: ['23 g de café', '350 g de agua', 'Contacto orientativo: 2 min'],
      steps: ['Monta el equipo y calienta el agua siguiendo su manual.', 'Cuando suba el agua, incorpora el café y mantén una agitación constante.', 'Retira el calor, deja bajar la bebida y prueba la taza.'],
      note: 'La receta de 23 g y 350 ml publicada por Hario procede de una colaboración con Blue Bottle.',
      source: 'https://www.hario-usa.com/blogs/syphon-recipes-and-guides/blue-bottle-syphon-recipe', filterMethod: 'siphon'
    },
    aeropress: {
      name: 'AeroPress', kind: 'ratio', lead: 'Preparación rápida de inmersión y presión manual.',
      metrics: ['16 g de café', '200 g de agua · ejemplo Peppos', 'Contacto: 1 min'],
      steps: ['Coloca un filtro en la tapa y monta la AeroPress sobre una taza resistente.', 'Añade unos 16 g de café de molienda media y 200 g de agua como ensayo Peppos; respeta el máximo de tu modelo.', 'Remueve suavemente, espera alrededor de un minuto y presiona despacio.'],
      note: 'AeroPress recomienda 16–18 g, molienda media y espera de un minuto en su guía. Los 200 g de agua son una propuesta editable Peppos.',
      source: 'https://aeropress.com/pages/how-to-use', defaults: { dose: 16, water: 200, ratio: 12.5, time: 1, timeUnit: 'min' }
    },
    moka: {
      name: 'Moka italiana', kind: 'moka', lead: 'Respeta el tamaño de la cafetera: el llenado importa más que un ratio universal.',
      metrics: ['Agua bajo la válvula', 'Cestillo lleno sin prensar', 'Retirar al terminar'],
      steps: ['Llena la base con agua justo por debajo de la válvula de seguridad.', 'Llena el embudo de café molido sin prensarlo y ciérralo bien.', 'Calienta con cuidado y retira la cafetera cuando termine de salir la bebida.'],
      note: 'Sigue el manual de tu modelo. No tapes la válvula ni compactes el café: Bialetti indica ambos puntos.',
      source: 'https://bialetti-cookware.zendesk.com/hc/en-us/articles/5416235346322-How-to-use-the-Moka-Express'
    },
    cold: {
      name: 'Cold brew', kind: 'cold', lead: 'Elige si quieres un concentrado para diluir o una bebida lista para tomar.',
      metrics: ['Concentrado inicial 1:5,6', 'Molienda gruesa', '8–24 h orientativas'],
      steps: ['Muele grueso, mezcla el café con agua fría y humedece todos los granos.', 'Deja infusionar y filtra según el equipo; registra temperatura y tiempo.', 'Si preparas concentrado, comienza diluyendo 1 parte de café con 2 partes de agua o leche y ajusta al gusto.'],
      note: 'Toddy publica la receta de concentrado y la dilución inicial. La variante lista para tomar de esta app es una propuesta Peppos editable.',
      source: 'https://toddycafe.com/cold-brew/instruction-manual', defaults: { dose: 50, water: 280, ratio: 5.6, time: 16, timeUnit: 'h' }
    },
    french: {
      name: 'Prensa francesa', kind: 'ratio', lead: 'Inmersión sencilla con cuerpo y textura.',
      metrics: ['18 g de café', '300 g de agua · ejemplo Peppos', 'Contacto: 4 min'],
      steps: ['Añade café de molienda gruesa a la prensa.', 'Vierte agua caliente, remueve suavemente y coloca la tapa.', 'Espera unos cuatro minutos, baja el émbolo lentamente y sirve.'],
      note: 'Bodum indica molienda gruesa y cuatro minutos. La dosis de 18 g para 300 g de agua es un ejemplo editable Peppos.',
      source: 'https://www.bodum.com/us/en/1928-16us4-chambord', defaults: { dose: 18, water: 300, ratio: 300 / 18, time: 4, timeUnit: 'min' }
    },
    superauto: {
      name: 'Superautomática', kind: 'superauto', lead: 'Calibra lo que tu máquina sí permite controlar: intensidad, volumen y molienda.',
      metrics: ['Anota el modelo', 'Elige intensidad', 'Ajusta volumen de taza'],
      steps: ['Selecciona un café Peppos e indica el modelo de máquina.', 'Empieza con intensidad media y un volumen de taza que te guste; anota el resultado.', 'Prueba el sabor. Si cambias el molinillo, sigue el manual de tu modelo y cambia un paso cada vez.'],
      note: 'En algunas DeLonghi el dial solo debe moverse mientras el molinillo funciona; comprueba las instrucciones de tu propia máquina.',
      source: 'https://www.delonghi.com/en-us/faqs/How-do-I-adjust-the-coffee-grinder/a/16661'
    }
  };

  const processPrompts = {
    washed: 'Pregunta de cata Peppos: ¿qué claridad, acidez y dulzor percibes en esta taza?',
    honey: 'Pregunta de cata Peppos: ¿cómo describirías su dulzor, textura y equilibrio?',
    natural: 'Pregunta de cata Peppos: ¿qué aromas y sensaciones en boca destacarías?',
    cofermented: 'Pregunta de cata Peppos: ¿qué aromas y sabores aparecen? Anótalos sin asumir un perfil fijo.',
    other: 'Pregunta de cata Peppos: describe el sabor con tus propias palabras y compara dos preparaciones.',
    '': 'Elige un proceso para ver una pregunta de cata. No modifica la receta inicial.'
  };

  function evaluateManual(input) {
    const method = methods[input.method];
    if (!method || !['ratio', 'cold', 'moka', 'superauto'].includes(method.kind)) return null;
    if (!['untried', 'balanced', 'sour', 'bitter', 'uneven'].includes(input.taste) || !['balanced', 'weak', 'strong'].includes(input.strength)) return null;
    const result = { method: input.method, methodName: method.name, kind: method.kind, taste: input.taste, strength: input.strength };
    let title = input.taste === 'untried' ? 'Prueba la taza primero' : 'Repite y compara';
    let advice = input.taste === 'untried' ? 'Registra los valores y prueba el café antes de decidir un ajuste.' : 'La taza te gusta: mantén la receta y anota el resultado.';
    let targetText = '';

    if (method.kind === 'ratio' || method.kind === 'cold') {
      const { dose, water, targetRatio, time } = input;
      if (![dose, water, targetRatio, time].every(Number.isFinite) || dose <= 0 || water <= 0 || targetRatio <= 0 || time < 0) return null;
      result.dose = dose; result.water = water; result.targetRatio = targetRatio; result.time = time;
      result.timeUnit = method.defaults.timeUnit;
      result.actualRatio = water / dose;
      result.targetWater = dose * targetRatio;
      targetText = `Para ${dose.toFixed(1)} g de café, el ratio 1:${targetRatio.toFixed(1)} pide ${result.targetWater.toFixed(0)} g de agua; has usado ${water.toFixed(0)} g.`;
      if (method.kind === 'cold') {
        if (!['concentrate', 'ready'].includes(input.brewStyle)) return null;
        result.brewStyle = input.brewStyle;
        result.dilution = Number.isFinite(input.dilution) && input.dilution >= 0 ? input.dilution : null;
        if (input.brewStyle === 'concentrate') targetText += ' Es concentrado: registra también la dilución al servir.';
        else targetText += ' Es una prueba lista para tomar, no concentrado Toddy.';
      }
      if (input.taste === 'sour') { title = 'Prueba un poco más de extracción'; advice = method.kind === 'cold' ? 'Comprueba que todo el café se humedeció y compara un tiempo de contacto ligeramente mayor.' : 'Prueba un pequeño ajuste hacia molienda más fina o un contacto algo mayor; cambia solo una variable.'; }
      else if (input.taste === 'bitter') { title = 'Prueba un poco menos de extracción'; advice = method.kind === 'cold' ? 'Compara un contacto algo más corto y revisa filtrado y limpieza.' : 'Prueba una molienda un poco más gruesa o menos contacto; cambia solo una variable.'; }
      else if (input.taste === 'uneven') { title = 'Revisa la uniformidad'; advice = 'Comprueba humectación, agitación y filtrado antes de mover la molienda.'; }
      else if (input.taste !== 'untried' && input.strength === 'weak') { title = 'Ajusta la intensidad'; advice = 'Si el sabor es agradable pero ligero, prueba menos agua por la misma dosis antes de mover la molienda.'; }
      else if (input.taste !== 'untried' && input.strength === 'strong') { title = 'Ajusta la intensidad'; advice = 'Si el sabor es agradable pero intenso, prueba más agua o diluye el concentrado antes de mover la molienda.'; }
    } else if (method.kind === 'moka') {
      result.waterToValve = input.waterToValve === true;
      result.basketLevel = input.basketLevel === true;
      result.heat = input.heat || 'medium';
      if (!result.waterToValve || !result.basketLevel) { title = 'Corrige el llenado'; advice = 'Pon el agua bajo la válvula y llena el cestillo sin prensar antes de comparar el sabor.'; }
      else if (input.taste === 'bitter') { title = 'Revisa calor y final de preparación'; advice = 'Prueba menos calor y retira la moka cuando termine de salir la bebida; compara antes de cambiar molienda.'; }
      else if (input.taste === 'sour') { title = 'Prueba un pequeño ajuste'; advice = 'Comprueba el llenado y la temperatura; si todo es constante, prueba un punto de molienda ligeramente más fino.'; }
      else if (input.taste === 'uneven') { title = 'Revisa la preparación'; advice = 'Mantén el cestillo nivelado, sin prensar, y un calor estable antes de cambiar molienda.'; }
      targetText = 'Moka: se llena hasta bajo la válvula y se usa el cestillo de su tamaño; no se impone un ratio universal de agua.';
    } else {
      const volume = Number(input.waterVolume);
      if (!Number.isFinite(volume) || volume <= 0 || volume > 500) return null;
      result.model = String(input.model || '').trim();
      result.waterVolume = volume;
      result.strengthSetting = String(input.strengthSetting || 'media');
      result.grinderSetting = String(input.grinderSetting || '').trim();
      if (input.taste === 'sour') { title = 'Prueba un ajuste pequeño'; advice = 'Si tu modelo lo permite, prueba un paso hacia molienda más fina siguiendo su manual; espera varios cafés para evaluar el cambio.'; }
      else if (input.taste === 'bitter') { title = 'Prueba un ajuste pequeño'; advice = 'Compara un paso hacia molienda más gruesa o menos intensidad, siguiendo el manual de tu modelo.'; }
      else if (input.taste === 'uneven') { title = 'Revisa máquina y café'; advice = 'Limpia el sistema según su manual y repite varias tazas antes de cambiar ajustes.'; }
      else if (input.taste !== 'untried' && input.strength === 'weak') { title = 'Más intensidad'; advice = 'Prueba mayor intensidad o menos volumen de agua, un cambio cada vez.'; }
      else if (input.taste !== 'untried' && input.strength === 'strong') { title = 'Menos intensidad'; advice = 'Prueba menor intensidad o más volumen de agua, un cambio cada vez.'; }
      targetText = `Configuración registrada: ${volume.toFixed(0)} ml de agua y fuerza ${result.strengthSetting}. La dosis real depende del modelo.`;
    }
    return { ...result, title, advice, targetText };
  }

  return { methods, processPrompts, evaluateManual };
}));
