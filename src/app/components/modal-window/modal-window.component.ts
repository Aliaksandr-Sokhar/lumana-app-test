import { Component, computed, DestroyRef, ElementRef, EventEmitter, inject, Input, Output, Renderer2, signal, viewChild } from '@angular/core';
import { CharacterInterface } from '../../interfaces/characters.interface';
import { Figure, Vector } from '../../classes/canvas-figure.class';
import { CanvasState, RECTANGLE_COLOR } from '../../consts/canvas.const';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { select, Store } from "@ngrx/store";
import { ChangedCanvasCharacter } from '../../interfaces/canvas.interface';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, filter, fromEvent, map, switchMap, takeUntil, tap, throttleTime } from 'rxjs';
import { selectChangedCharactersById, selectChangedCharacters } from '../../store/characters.selectors';
import { updateChangedCharacters } from '../../store/characters.actions';

@Component({
  selector: 'app-modal-window',
  imports: [FormsModule, ReactiveFormsModule],
  templateUrl: './modal-window.component.html',
  styleUrl: './modal-window.component.scss'
})
export class ModalWindowComponent {
  @Input({ required: true }) activeCharacter!: CharacterInterface;
  @Output() interactionFinished = new EventEmitter<boolean>();

  public zoomLevel = signal<number>(1);
  protected readonly colorOptions = RECTANGLE_COLOR;
  protected selectedColorControl = new FormControl(this.colorOptions.purple);

  private destroyRef = inject(DestroyRef);
  private store = inject(Store);
  private renderer = inject(Renderer2);
  private initialPopupWidth = 0;
  private allCanvasData$ = this.store.select(selectChangedCharacters);
  private allCanvasData: ChangedCanvasCharacter[] = [];
  private figureCollection: Figure[] = [];
  private canvasMode: CanvasState = CanvasState.idle;

  private canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>("canvas");
  private canvas = computed(() => this.canvasRef().nativeElement);
  private context = computed(() => this.canvas().getContext("2d") as CanvasRenderingContext2D);
  private popupRef = viewChild.required<ElementRef<HTMLElement>>("popup");
  private popup = computed(() => this.popupRef().nativeElement);
  private resizerRef = viewChild.required<ElementRef<HTMLElement>>("resizer");
  private resizer = computed(() => this.resizerRef().nativeElement);

  ngOnInit(): void {
    this.setupPopupResizing();
    this.initializeCanvasSettings();
    this.loadSavedFigures();
    this.initializeCanvasInteractions();
  }

  private loadSavedFigures(): void {
    this.store
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        select(selectChangedCharactersById(this.activeCharacter.id))
      )
      .subscribe((canvasData) => {
        this.figureCollection = [];
        canvasData?.canvas.forEach((figureData) => {
          const { vertices, rotation, fillColor } = figureData;
          const newFigure = new Figure(vertices, rotation, fillColor);
          this.figureCollection.push(newFigure);
        });
        this.renderAllFigures();
      });

    this.allCanvasData$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((allData) => {
        this.allCanvasData = [...allData];
      });
  }

  public persistChangesAndExit(): void {
    const characterIndex = this.allCanvasData.findIndex(
      (item) => item.characterId === this.activeCharacter.id
    );
    const updatedCanvasData: ChangedCanvasCharacter = {
      characterId: this.activeCharacter.id,
      canvas: [...this.figureCollection],
    };

    const newCanvasCollection =
      characterIndex > -1
        ? [
            ...this.allCanvasData.slice(0, characterIndex),
            updatedCanvasData,
            ...this.allCanvasData.slice(characterIndex + 1),
          ]
        : [...this.allCanvasData, updatedCanvasData];

    this.store.dispatch(updateChangedCharacters({ changedCharacters: newCanvasCollection }));
    this.closeModal();
  }

  get activeColor(): string {
    return this.selectedColorControl.value || RECTANGLE_COLOR.purple;
  }

  public closeModal(): void {
    this.interactionFinished.emit(false);
  }

  protected clearAllFigures(): void {
    this.figureCollection = [];
    this.renderAllFigures();
  }

  private setupPopupResizing(): void {
    fromEvent<MouseEvent>(this.resizer(), "mousedown").subscribe((startEvent) => {
      const initialMouseX = startEvent.clientX;
      const initialPopupWidth = this.popup().offsetWidth;

      const mouseMoveStream$ = fromEvent<MouseEvent>(document, "mousemove");
      const mouseUpStream$ = fromEvent<MouseEvent>(document, "mouseup");

      const resizeSubscription = mouseMoveStream$
        .pipe(takeUntil(mouseUpStream$))
        .subscribe((moveEvent) => {
          const newWidth = initialPopupWidth + (moveEvent.clientX - initialMouseX);
          this.renderer.setStyle(this.popup(), "width", `${newWidth}px`);
          this.zoomLevel.set(this.popup().offsetWidth / this.initialPopupWidth);
        });

      mouseUpStream$.subscribe(() => resizeSubscription.unsubscribe());
    });
  }

  private initializeCanvasSettings(): void {
    this.initialPopupWidth = this.popup().offsetWidth;
    const canvasWidth = this.initialPopupWidth - 40;
    const canvasHeight = this.popup().offsetHeight - 100;
    this.renderer.setStyle(this.canvas(), "width", `${canvasWidth}px`);
    this.renderer.setStyle(this.canvas(), "height", `${canvasHeight}px`);
    this.canvas().style.backgroundImage = `url(${this.activeCharacter.image})`;
    this.applyDevicePixelRatio();

    fromEvent(window, "resize")
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (!this.popup().style.width.includes("%")) {
          const newWidth = (this.popup().offsetWidth / window.innerWidth) * 100;
          this.renderer.setStyle(this.popup(), "width", `${Math.trunc(newWidth)}%`);
        }
        this.zoomLevel.set(this.popup().offsetWidth / this.initialPopupWidth);
      });
  }

  private eraseCanvas(): void {
    this.context().clearRect(0, 0, this.canvas().width, this.canvas().height);
  }

  private isCloseToStartVertex(currentPolygon: Vector[], x: number, y: number): boolean {
    if (currentPolygon.length === 0) return false;
    const closingRadius = 10;
    const startVertex = currentPolygon[0];
    const distance = Math.hypot(x - startVertex.x, y - startVertex.y);
    return distance <= closingRadius;
  }

  private renderAllFigures(): void {
    this.eraseCanvas();
    this.figureCollection.forEach((figure) => figure.render(this.context()));
  }

  private applyDevicePixelRatio(): void {
    const pixelRatio = window.devicePixelRatio;
    this.canvas().width = this.canvas().clientWidth * pixelRatio;
    this.canvas().height = this.canvas().clientHeight * pixelRatio;
  }

  private initializeCanvasInteractions(): void {
    const canvasMouseDown$ = fromEvent<MouseEvent>(this.canvas(), "mousedown");
    const globalMouseMove$ = fromEvent<MouseEvent>(document, "mousemove");
    const globalMouseUp$ = fromEvent<MouseEvent>(document, "mouseup");
    let currentDrawing: Vector[] = [];

    canvasMouseDown$.pipe(
        takeUntilDestroyed(this.destroyRef),
        filter(() => this.canvasMode === CanvasState.idle || this.canvasMode === CanvasState.drawing),
        map((mouseEvent) => ({ x: mouseEvent.offsetX, y: mouseEvent.offsetY })),
        tap(({ x, y }) => {
          const ctx = this.context();
          ctx.fillStyle = `rgba(${this.activeColor}, 0.5)`;
          ctx.lineWidth = 2;
          ctx.strokeStyle = `rgba(${this.activeColor})`;
          if (this.canvasMode === CanvasState.idle) {
            this.canvasMode = CanvasState.drawing;
            currentDrawing.push({ x, y });
            ctx.beginPath();
            ctx.moveTo(x, y);
          } else {
            if (this.isCloseToStartVertex(currentDrawing, x, y)) {
              ctx.closePath();
              ctx.stroke();
              ctx.fill();
              const newFigure = new Figure(currentDrawing, 0, this.activeColor);
              this.figureCollection.push(newFigure);
              this.canvasMode = CanvasState.idle;
              currentDrawing = [];
              this.renderAllFigures();
            } else {
              currentDrawing.push({ x, y });
              currentDrawing.forEach((point, index) => {
                index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y);
              });
              ctx.stroke();
            }
          }
        }),
        switchMap(({ x, y }) =>
          globalMouseMove$.pipe(
            throttleTime(16),
            filter(() => this.canvasMode === CanvasState.drawing),
            map((mouseEvent) => ({ currentX: mouseEvent.offsetX, currentY: mouseEvent.offsetY })),
            tap(({ currentX, currentY }) => {
              const previousVertex = currentDrawing.at(-1) || { x, y };
              this.renderAllFigures();
              const ctx = this.context();
              ctx.lineWidth = 2;
              ctx.strokeStyle = `rgba(${this.activeColor})`;
              ctx.beginPath();
              currentDrawing.forEach((point, index) => {
                index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y);
              });
              ctx.stroke();
              ctx.moveTo(previousVertex.x, previousVertex.y);
              ctx.lineTo(currentX, currentY);
              ctx.stroke();
            })
          )
        )
      ).subscribe();

    globalMouseMove$.pipe(
        filter(() => this.canvasMode !== CanvasState.drag && this.canvasMode !== CanvasState.drawing),
        map((mouseEvent) => {
          const hoveredFigure = this.figureCollection.find((item) => item.isPointerOver(this.context(), mouseEvent.offsetX, mouseEvent.offsetY));
          const figureToRotate = this.figureCollection.find((item) => item.isPointerNearRotationHandle(this.context(), mouseEvent.offsetX, mouseEvent.offsetY));
          return figureToRotate ? "rotate" : hoveredFigure ? "move" : null;
        }),
        takeUntilDestroyed(this.destroyRef)
      ).subscribe((cursorAction) => {
        switch (cursorAction) {
          case "move":
            this.canvas().style.cursor = "grab";
            this.canvasMode = CanvasState.moving;
            break;
          case "rotate":
            this.canvas().style.cursor = "move";
            this.canvasMode = CanvasState.rotating;
            break;
          default:
            this.canvas().style.cursor = "default";
            this.canvasMode = CanvasState.idle;
            break;
        }
      });

    canvasMouseDown$.pipe(
        filter(() => this.canvasMode === CanvasState.moving),
        switchMap((startDragEvent) => {
          this.canvasMode = CanvasState.drag;
          const targetFigure = this.figureCollection.find((item) => item.isPointerOver(this.context(), startDragEvent.offsetX, startDragEvent.offsetY));
          if (!targetFigure) return EMPTY;
          
          this.renderAllFigures();
          targetFigure.drawSelectionFrame(this.context());
          
          let lastMouseX = startDragEvent.offsetX;
          let lastMouseY = startDragEvent.offsetY;

          return globalMouseMove$.pipe(
            tap((moveEvent) => {
              const deltaX = moveEvent.offsetX - lastMouseX;
              const deltaY = moveEvent.offsetY - lastMouseY;
              lastMouseX = moveEvent.offsetX;
              lastMouseY = moveEvent.offsetY;
              targetFigure.translate(deltaX, deltaY);
              this.renderAllFigures();
              targetFigure.drawSelectionFrame(this.context());
            }),
            takeUntil(globalMouseUp$.pipe(tap(() => (this.canvasMode = CanvasState.idle))))
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      ).subscribe();

    canvasMouseDown$.pipe(
        filter(() => this.canvasMode === CanvasState.rotating),
        switchMap((startDragEvent) => {
          this.canvasMode = CanvasState.drag;
          const targetFigure = this.figureCollection.find((item) => item.isPointerNearRotationHandle(this.context(), startDragEvent.offsetX, startDragEvent.offsetY));
          if (!targetFigure) return EMPTY;
          
          return globalMouseMove$.pipe(
            tap((moveEvent) => {
              const cursorX = moveEvent.offsetX;
              const cursorY = moveEvent.offsetY;
              targetFigure.rotation = targetFigure.getAngleForRotation(cursorX, cursorY);
              this.renderAllFigures();
              targetFigure.render(this.context());
              targetFigure.drawSelectionFrame(this.context());
            }),
            takeUntil(globalMouseUp$.pipe(tap(() => (this.canvasMode = CanvasState.idle))))
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      ).subscribe();
  }
}