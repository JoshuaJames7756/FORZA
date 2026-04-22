// src/context/WorkoutContext.jsx
import { createContext, useContext, useState } from 'react'

const WorkoutContext = createContext()

export function WorkoutProvider({ children }) {
  // Guardamos todo el estado que antes estaba en la página
  const [workoutState, setWorkoutState] = useState({
    view: 'select',      // 'select' | 'active' | 'finish'
    selectedRoutine: null,
    exercises: [],
    session: null,
    sets: {},
    prevSets: {},
    activeEx: 0,
    startTime: null,
  })

  // Función para limpiar la sesión al terminar
  const resetWorkout = () => {
    setWorkoutState({
      view: 'select',
      selectedRoutine: null,
      exercises: [],
      session: null,
      sets: {},
      prevSets: {},
      activeEx: 0,
      startTime: null,
    })
  }

  return (
    <WorkoutContext.Provider value={{ workoutState, setWorkoutState, resetWorkout }}>
      {children}
    </WorkoutContext.Provider>
  )
}

export const useWorkout = () => useContext(WorkoutContext)