import {
  DndContext, closestCenter,
  PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, rectSortingStrategy,
  useSortable, arrayMove, sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// Egy húzható sor: bal oldalt fogantyú, jobbra a tartalom (a fogantyún kívül
// minden kattintható marad – gombok, mezők).
export function SortableItem({ id, children, variant = 'list' }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 20 : undefined,
    position: 'relative',
  }

  // Rács-változat: a fogantyú overlay-ként a kártya bal felső sarkában
  if (variant === 'grid') {
    return (
      <div ref={setNodeRef} style={style} className={`dnd-grid-item ${isDragging ? 'dnd-row--dragging' : ''}`}>
        <button
          type="button"
          className="dnd-handle dnd-handle--overlay"
          aria-label="Húzd az átrendezéshez"
          {...attributes}
          {...listeners}
        >
          ⠿
        </button>
        {children}
      </div>
    )
  }

  // Lista-változat: bal oldali fogantyú + tartalom
  return (
    <div ref={setNodeRef} style={style} className={`dnd-row ${isDragging ? 'dnd-row--dragging' : ''}`}>
      <button
        type="button"
        className="dnd-handle"
        aria-label="Húzd az átrendezéshez"
        {...attributes}
        {...listeners}
      >
        ⠿
      </button>
      <div className="dnd-row-body">{children}</div>
    </div>
  )
}

// items: string id-k tömbje (a SortableItem id-jaival egyezően)
// onReorder(newOrderedIds): az új sorrend
// strategy: 'grid' → rácsban rendezés; egyébként függőleges lista
export default function SortableList({ items, onReorder, strategy, children }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.indexOf(active.id)
    const newIndex = items.indexOf(over.id)
    if (oldIndex < 0 || newIndex < 0) return
    onReorder(arrayMove(items, oldIndex, newIndex))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={items}
        strategy={strategy === 'grid' ? rectSortingStrategy : verticalListSortingStrategy}
      >
        {children}
      </SortableContext>
    </DndContext>
  )
}
