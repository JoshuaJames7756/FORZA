// src/lib/macros.js
/**
 * Calcula las metas diarias de macronutrientes según el perfil del usuario.
 * Fórmula basada en peso corporal y objetivo.
 *
 * @param {{ weight_kg: number, goal: string, level: string }} profile
 * @returns {{ calories: number, protein_g: number, carbs_g: number, fat_g: number }}
 */
export function calcMacroGoals(profile) {
  const weight = parseFloat(profile?.weight_kg) || 75
  const goal   = profile?.goal   || 'maintain'
  const level  = profile?.level  || 'beginner'

  // Multiplicador de actividad
  const activityMultiplier = level === 'advanced' ? 1.725 : level === 'intermediate' ? 1.55 : 1.375

  // TDEE base (usamos Harris-Benedict simplificado para hombre promedio)
  // Para un cálculo más preciso necesitaríamos altura y edad — pendiente
  const bmr  = 10 * weight + 6.25 * 170 - 5 * 25 + 5   // asumiendo 170cm, 25 años, hombre
  const tdee = Math.round(bmr * activityMultiplier)

  let calories, protein_g, carbs_g, fat_g

  switch (goal) {
    case 'muscle':
      // Superávit calórico moderado (~300 kcal)
      calories  = tdee + 300
      protein_g = Math.round(weight * 2.2)   // 2.2g/kg
      fat_g     = Math.round(weight * 1.0)   // 1g/kg
      carbs_g   = Math.round((calories - protein_g * 4 - fat_g * 9) / 4)
      break

    case 'fat_loss':
      // Déficit calórico moderado (~400 kcal)
      calories  = tdee - 400
      protein_g = Math.round(weight * 2.5)   // 2.5g/kg para preservar músculo
      fat_g     = Math.round(weight * 0.8)   // 0.8g/kg
      carbs_g   = Math.round((calories - protein_g * 4 - fat_g * 9) / 4)
      break

    case 'maintain':
    default:
      calories  = tdee
      protein_g = Math.round(weight * 2.0)   // 2g/kg
      fat_g     = Math.round(weight * 0.9)   // 0.9g/kg
      carbs_g   = Math.round((calories - protein_g * 4 - fat_g * 9) / 4)
      break
  }

  // Asegurarnos de que los carbos no sean negativos
  if (carbs_g < 50) carbs_g = 50

  return {
    calories:  Math.max(calories,  1200),
    protein_g: Math.max(protein_g, 50),
    carbs_g:   Math.max(carbs_g,   50),
    fat_g:     Math.max(fat_g,     30),
  }
}