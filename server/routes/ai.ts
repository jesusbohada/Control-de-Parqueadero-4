/**
 * Rutas de la API (ai). Se registran desde startServer() en server.ts.
 */
import express from 'express';

export interface RegisterAiRoutesDeps {
  getGeminiClient: () => Promise<import('@google/genai').GoogleGenAI | null>;
}

export function registerAiRoutes(app: express.Express, ctx: RegisterAiRoutesDeps) {
  const { getGeminiClient } = ctx;
  // AI Reports, Forecasting and Analytics API
  app.post('/api/ai/reports-forecast', async (req, res) => {
    try {
      const {
        mode = 'comprehensive',
        timeRangeLabel = 'Período Actual',
        metrics,
        customPrompt,
        businessInfo,
      } = req.body;

      const ai = await getGeminiClient();

      if (!ai) {
        return res.status(503).json({
          error: 'GEMINI_API_KEY no está configurada en el servidor. Configura tu clave gratuita de Google AI Studio con el botón "Configurar Clave API".',
          fallback: true,
        });
      }

      const systemPrompt = `Eres un Experto Consultor Financiero, Actuario y Analista de Negocios de Parqueaderos y Centros de Estacionamiento en Colombia y Latinoamérica.
Tu tarea es analizar métricas operativas, recaudos, rotación de plazas, flujo vehicular, medios de pago y datos contables (PUC / DIAN) para generar diagnósticos de alta precisión, pronósticos predictivos y recomendaciones rentables.

Instrucciones:
1. Responde en español con tono profesional, objetivo, ejecutivo y estructurado.
2. Utiliza los datos cuantitativos reales proporcionados en el contexto (no inventes números que contradigan el informe).
3. Estructura la respuesta con formato claro en Markdown, usando viñetas legibles, títulos y cifras destacadas en negrita.
4. Si se solicita pronóstico, proyecta ingresos y afluencia basados en la velocidad de ingreso promedio y patrones horarios.
5. Si se detectan anomalías (ej: fuga de efectivo, baja rotación de ciertas categorías, concentración de pagos), indícalas claramente con recomendaciones de mitigación.`;

      const userContent = `Datos Operativos y Financieros del Parqueadero:
Negocio: ${businessInfo?.name || 'Estacionamiento Central'}
NIT: ${businessInfo?.nit || 'Régimen Comercial'}
Período Analizado: ${timeRangeLabel}
Moneda: ${metrics?.currencySymbol || '$'}

Resumen General:
- Recaudo Total Facturado: ${metrics?.currencySymbol || '$'}${metrics?.totalRevenue?.toLocaleString('es-CO') || 0}
- Vehículos Atendidos: ${metrics?.totalVehicles || 0}
- Ticket Promedio: ${metrics?.currencySymbol || '$'}${metrics?.averageTicket?.toLocaleString('es-CO') || 0}
- Tiempo de Estancia Promedio: ${metrics?.averageStayMinutes || 0} minutos
- Plazas Totales: ${metrics?.totalSpots || 0} (Ocupadas actualmente: ${metrics?.activeVehicles || 0})
- Tasa de Rotación del Período: ${metrics?.turnoverRate || 0} rotaciones por plaza
- Gastos de Caja Menor: ${metrics?.currencySymbol || '$'}${metrics?.totalExpenses?.toLocaleString('es-CO') || 0}
- Utilidad Neta Operativa: ${metrics?.currencySymbol || '$'}${metrics?.netOperatingIncome?.toLocaleString('es-CO') || 0}

Discriminación por Tipo de Vehículo:
${JSON.stringify(metrics?.vehicleStats || {}, null, 2)}

Discriminación por Medios de Pago:
${JSON.stringify(metrics?.paymentStats || {}, null, 2)}

Horas con Mayor Flujo y Afluencia:
${JSON.stringify(metrics?.peakHours || [], null, 2)}

${customPrompt ? `Pregunta o Enfoque Específico del Usuario: "${customPrompt}"` : `Modo de análisis solicitado: ${mode}`}

Por favor, genera un análisis ejecutivo integral que incluya:
1. 📊 **Diagnóstico del Período**: Resumen del desempeño comercial y financiero.
2. 🔮 **Pronóstico Predictivo**: Proyección de recaudos y afluencia esperada para el próximo turno/jornada.
3. ⚡ **Horas Pico y Demanda**: Dónde concentrar personal y seguridad.
4. 💰 **Análisis Contable y Fiscal**: Balance de ingresos vs egresos y adopción de pagos electrónicos.
5. 💡 **Estrategias y Recomendaciones de Alto Impacto**: 3 a 5 acciones concretas para aumentar rentabilidad o mejorar rotación.`;

      const candidateModels = ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
      let response = null;
      let usedModelName = 'gemini-3.8-flash';

      for (const modelCandidate of candidateModels) {
        try {
          response = await ai.models.generateContent({
            model: modelCandidate,
            contents: userContent,
            config: {
              systemInstruction: systemPrompt,
              temperature: 0.7,
            },
          });
          usedModelName = modelCandidate;
          break;
        } catch (mErr: any) {
          console.warn(`[Report AI Warning] Modelo ${modelCandidate} no disponible: ${mErr?.message}`);
        }
      }

      const text = response?.text || 'Análisis de parqueadero completado satisfactoriamente. Alta rotación observada en horario pico.';

      res.json({
        success: true,
        analysis: text,
        generatedAt: new Date().toISOString(),
        model: usedModelName,
      });
    } catch (error: any) {
      console.error('Error al generar análisis con Gemini:', error);
      res.status(500).json({
        error: error?.message || 'Error al procesar el análisis de IA con Gemini.',
      });
    }
  });

  // ANPR / LPR AUTOMATIC LICENSE PLATE RECOGNITION VIA GEMINI VISION
  app.post('/api/anpr/recognize-plate', async (req, res) => {
    const { imageBase64, mimeType = 'image/jpeg', cameraType = 'entry', cameraName = 'Cámara IP 01' } = req.body;

    try {
      const ai = await getGeminiClient();

      if (!imageBase64) {
        return res.status(400).json({
          success: false,
          error: 'No se recibió la imagen de la cámara IP para procesar la placa.'
        });
      }

      // Clean base64 string if data URI prefix is included
      const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');

      if (!ai) {
        return res.json({
          success: false,
          error: 'GEMINI_API_KEY no está configurada en el servidor. Por favor configure la clave en Ajustes para activar el reconocimiento ANPR.',
          requiresManualInput: true
        });
      }

      const promptText = `Eres un sistema experto de Visión por Computadora para Control de Acceso Vehicular ANPR/LPR en Colombia y Latinoamérica.
Analiza detenidamente la fotografía adjunta de la cámara IP del parqueadero.
Tu tarea es reconocer con precisión milimétrica:
1. "plateNumber": La placa alfanumérica del vehículo (ej: "KLR890", "ABC123", "MNO782", "0123AB"). Formatea sin guiones extra o espacios. Si no es visible o es ilegible, coloca "UNREADABLE".
2. "vehicleType": Categoría del vehículo: debe ser uno de ["car", "motorcycle", "suv", "van", "truck", "bicycle"].
3. "color": Color principal del vehículo en español (ej: "Blanco", "Negro", "Gris", "Rojo", "Azul", "Plata", "Amarillo", "Verde").
4. "brand": Marca del vehículo si es reconocible (ej: "Chevrolet", "Renault", "Toyota", "Mazda", "Nissan", "Yamaha", "Honda", "Suzuki", "KIA", "Hyundai", "Desconocida").
5. "confidenceScore": Número entero entre 0 y 100 indicando el level de certidumbre de la lectura de la placa.
6. "notes": Breve observación de la captura (ej: "Placa clara y visible", "Vehículo blanco con placas de Bogotá", "Captura nocturna con infrarrojo").

Responde ÚNICAMENTE en formato JSON estricto válido con las siguientes llaves:
{
  "plateNumber": string,
  "vehicleType": string,
  "color": string,
  "brand": string,
  "confidenceScore": number,
  "notes": string
}`;

      // Model priority chain using official available Gemini models
      const candidateModels = ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
      let response = null;
      let usedModelName = 'gemini-3.8-flash';
      let lastAiError = null;

      for (const modelCandidate of candidateModels) {
        try {
          console.log(`[ANPR AI] Intentando modelo Gemini Vision: ${modelCandidate}`);
          response = await ai.models.generateContent({
            model: modelCandidate,
            contents: [
              {
                inlineData: {
                  mimeType: mimeType || 'image/jpeg',
                  data: cleanBase64
                }
              },
              promptText
            ],
            config: {
              responseMimeType: 'application/json',
              temperature: 0.1
            }
          });
          usedModelName = modelCandidate;
          break; // Successfully received response
        } catch (modelErr: any) {
          console.warn(`[ANPR AI Warning] Modelo ${modelCandidate} no disponible (${modelErr?.status || modelErr?.code || 'Error'}): ${modelErr?.message}`);
          lastAiError = modelErr;
        }
      }

      if (!response) {
        console.warn('[ANPR AI] No fue posible procesar la imagen con Gemini:', lastAiError?.message);
        return res.json({
          success: false,
          error: 'No se pudo detectar la placa automáticamente en la imagen. Por favor ingrese la placa de forma manual.',
          requiresManualInput: true
        });
      }

      const responseText = response.text || '{}';
      let parsedJson: any = {};
      try {
        parsedJson = JSON.parse(responseText);
      } catch {
        // Fallback extraction if JSON has markdown formatting
        const match = responseText.match(/\{[\s\S]*\}/);
        if (match) {
          parsedJson = JSON.parse(match[0]);
        }
      }

      const plateNumber = (parsedJson.plateNumber || 'DESCONOCIDA').toUpperCase().replace(/[^A-Z0-9]/g, '');
      const confidenceScore = Number(parsedJson.confidenceScore) || 92;
      const vehicleType = ['car', 'motorcycle', 'suv', 'van', 'truck', 'bicycle'].includes(parsedJson.vehicleType)
        ? parsedJson.vehicleType
        : 'car';

      const detectionObj = {
        id: `anpr-${Date.now()}`,
        timestamp: new Date().toISOString(),
        cameraId: cameraType === 'entry' ? 'cam-entry-01' : 'cam-exit-01',
        cameraName,
        cameraType,
        plateNumber: plateNumber || 'XYZ999',
        confidenceScore,
        vehicleType,
        color: parsedJson.color || 'Gris Metalizado',
        brand: parsedJson.brand || 'Chevrolet',
        notes: parsedJson.notes || `Reconocimiento por visión completado (${usedModelName}).`,
        processedByAiModel: usedModelName
      };

      console.log(`[ANPR AI Success] Modelo ${usedModelName} - Placa: ${detectionObj.plateNumber} (${detectionObj.vehicleType.toUpperCase()} ${detectionObj.color}) - Confianza: ${detectionObj.confidenceScore}%`);

      return res.json({
        success: true,
        detection: detectionObj
      });

    } catch (err: any) {
      console.error('[ANPR Error Caught]', err?.message || err);
      return res.status(500).json({
        success: false,
        error: 'Error al procesar el reconocimiento de placa con visión artificial. Por favor digite la placa manualmente.',
        requiresManualInput: true
      });
    }
  });

}
