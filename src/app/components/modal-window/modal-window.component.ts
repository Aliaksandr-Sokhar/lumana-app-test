import { AfterViewInit, Component, computed, DestroyRef, ElementRef, EventEmitter, inject, Input, OnDestroy, OnInit, Output, signal, viewChild } from '@angular/core';
import { CharacterInterface } from '../../interfaces/characters.interface';
import { Figure, Vector } from '../../classes/canvas-figure.class';
import { CanvasState, RECTANGLE_COLOR } from '../../consts/canvas.const';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { select, Store } from "@ngrx/store";
import { ChangedCanvasCharacter } from '../../interfaces/canvas.interface';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, filter, fromEvent, map, startWith, switchMap, take, takeUntil, tap, throttleTime } from 'rxjs';
import { selectChangedCharactersById, selectChangedCharacters } from '../../store/characters.selectors';
import { updateChangedCharacters } from '../../store/characters.actions';

@Component({
  selector: 'app-modal-window',
  imports: [FormsModule, ReactiveFormsModule],
  templateUrl: './modal-window.component.html',
  styleUrl: './modal-window.component.scss'
})
export class ModalWindowComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input({ required: true }) activeCharacter!: CharacterInterface;
  @Output() interactionFinished = new EventEmitter<boolean>();

  public modalScale = signal<number>(1);

  protected readonly colorOptions = RECTANGLE_COLOR;
  protected selectedColorControl = new FormControl(this.colorOptions.purple);

  private destroyRef = inject(DestroyRef);
  private store = inject(Store);
  private allCanvasData$ = this.store.select(selectChangedCharacters);
  private allCanvasData: ChangedCanvasCharacter[] = [];
  private figureCollection: Figure[] = [];
  private canvasMode: CanvasState = CanvasState.idle;

  private selectedFigure: Figure | undefined | null = null;

  private readonly DESIGN_WIDTH = 1200;
  private readonly DESIGN_HEIGHT = 850;

  private canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>("canvas");
  private canvas = computed(() => this.canvasRef().nativeElement);
  private context = computed(() => this.canvas().getContext("2d") as CanvasRenderingContext2D);

  ngOnInit(): void {
    this.allCanvasData$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((allData) => this.allCanvasData = [...allData]);
  }

  ngAfterViewInit(): void {
    this.setupCanvas();
    this.setupScalingAndInteractions();
  }

  ngOnDestroy(): void {}

  private setupCanvas(): void {
    const canvas = this.canvas();
    const img = new Image();
    img.src = this.activeCharacter.image;

    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.style.backgroundImage = `url(${this.activeCharacter.image})`;
      this.loadSavedFigures();
    };
  }

  private setupScalingAndInteractions(): void {
    fromEvent(window, 'resize').pipe(
      startWith(null),
      throttleTime(50),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(() => this.updateModalScale());

    this.initializeCanvasInteractions();
  }

  private updateModalScale(): void {
    const availableWidth = window.innerWidth * 0.95;
    const availableHeight = window.innerHeight * 0.95;

    const scaleX = availableWidth / this.DESIGN_WIDTH;
    const scaleY = availableHeight / this.DESIGN_HEIGHT;

    this.modalScale.set(Math.min(scaleX, scaleY));
  }

  private getFigureBoundingBox(figure: Figure): { minX: number; minY: number; maxX: number; maxY: number } {
    if (!figure.vertices || figure.vertices.length === 0) {
        return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }

    let minX = figure.vertices[0].x;
    let minY = figure.vertices[0].y;
    let maxX = figure.vertices[0].x;
    let maxY = figure.vertices[0].y;

    for (const vertex of figure.vertices) {
        if (vertex.x < minX) minX = vertex.x;
        if (vertex.x > maxX) maxX = vertex.x;
        if (vertex.y < minY) minY = vertex.y;
        if (vertex.y > maxY) maxY = vertex.y;
    }
    return { minX, minY, maxX, maxY };
  }

  private loadSavedFigures(): void {
    this.store.pipe(
        select(selectChangedCharactersById(this.activeCharacter.id)),
        take(1)
      ).subscribe((canvasData) => {
        this.figureCollection = [];
        if (canvasData?.canvas) {
          canvasData.canvas.forEach((figureData) => {
            this.figureCollection.push(new Figure(figureData.vertices, figureData.rotation, figureData.fillColor));
          });
        }
        this.renderAllFigures();
      });
  }

  private getCanvasCoordinates(event: MouseEvent): Vector {
    const canvas = this.canvas();
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  };

  private isCloseToStartVertex(currentPolygon: Vector[], x: number, y: number): boolean {
    if (currentPolygon.length < 2) return false;
    const closingRadius = 10;
    const startVertex = currentPolygon[0];
    const distance = Math.hypot(x - startVertex.x, y - startVertex.y);
    return distance <= closingRadius;
  }
  
  private renderAllFigures(): void {
    const ctx = this.context();
    ctx.clearRect(0, 0, this.canvas().width, this.canvas().height);
    this.figureCollection.forEach((figure) => figure.render(ctx));
    if (this.selectedFigure) {
        this.selectedFigure.drawSelectionFrame(ctx);
    }
  }

  private initializeCanvasInteractions(): void {
    const canvasMouseDown$ = fromEvent<MouseEvent>(this.canvas(), "mousedown");
    const globalMouseMove$ = fromEvent<MouseEvent>(document, "mousemove");
    const globalMouseUp$ = fromEvent<MouseEvent>(document, "mouseup");
    let currentDrawing: Vector[] = [];

    globalMouseMove$.pipe(
        takeUntilDestroyed(this.destroyRef),
        filter(() => this.canvasMode !== CanvasState.drag && this.canvasMode !== CanvasState.drawing),
        map(event => this.getCanvasCoordinates(event))
    ).subscribe(({x, y}) => {
        const figureToRotate = this.figureCollection.find((item) => item.isPointerNearRotationHandle(this.context(), x, y));
        const hoveredFigure = this.figureCollection.find((item) => item.isPointerOver(this.context(), x, y));

        let newCursor = "default";
        if (figureToRotate) {
            newCursor = "move";
        } else if (hoveredFigure) {
            newCursor = "grab";
        }

        if (this.canvas().style.cursor !== newCursor) {
            this.canvas().style.cursor = newCursor;
        }
    });

    canvasMouseDown$.pipe(
        takeUntilDestroyed(this.destroyRef),
        map(event => ({ event, coords: this.getCanvasCoordinates(event) })),
        switchMap(({ event, coords }) => {
            event.preventDefault();
            const startPos = coords;

            const figureToRotate = this.figureCollection.find((item) => item.isPointerNearRotationHandle(this.context(), startPos.x, startPos.y));
            const hoveredFigure = this.figureCollection.find((item) => item.isPointerOver(this.context(), startPos.x, startPos.y));

            if (figureToRotate) {
                this.canvasMode = CanvasState.rotating;
            } else if (hoveredFigure) {
                this.canvasMode = CanvasState.moving;
            } else {
                this.canvasMode = this.canvasMode === CanvasState.drawing ? CanvasState.drawing : CanvasState.idle;
            }

            if (this.canvasMode === CanvasState.moving || this.canvasMode === CanvasState.rotating) {
                this.selectedFigure = figureToRotate || hoveredFigure;
            } else if (this.canvasMode === CanvasState.idle) {
                 this.selectedFigure = null;
            }

            this.renderAllFigures();

            switch (this.canvasMode) {
                case CanvasState.moving:
                    this.canvasMode = CanvasState.drag;
                    this.canvas().style.cursor = "grabbing";
                    let lastPos = startPos;

                    return globalMouseMove$.pipe(
                        map(moveEvent => this.getCanvasCoordinates(moveEvent)),
                        tap((movePos) => {
                            if (!this.selectedFigure) return;

                            const deltaX = movePos.x - lastPos.x;
                            const deltaY = movePos.y - lastPos.y;
                            lastPos = movePos;
                            
                            const bbox = this.getFigureBoundingBox(this.selectedFigure);
                            const canvasWidth = this.canvas().width;
                            const canvasHeight = this.canvas().height;

                            let finalDeltaX = deltaX;
                            let finalDeltaY = deltaY;
                            
                            if (bbox.minX + deltaX < 0) {
                                finalDeltaX = -bbox.minX;
                            }
                            if (bbox.maxX + deltaX > canvasWidth) {
                                finalDeltaX = canvasWidth - bbox.maxX;
                            }
                            if (bbox.minY + deltaY < 0) {
                                finalDeltaY = -bbox.minY;
                            }
                            if (bbox.maxY + deltaY > canvasHeight) {
                                finalDeltaY = canvasHeight - bbox.maxY;
                            }
                            
                            this.selectedFigure.translate(finalDeltaX, finalDeltaY);
                            this.renderAllFigures();
                        }),
                        takeUntil(globalMouseUp$.pipe(tap(() => {
                            this.canvasMode = CanvasState.idle;
                            this.canvas().style.cursor = "grab";
                        })))
                    );

                case CanvasState.rotating:
                    this.canvasMode = CanvasState.drag;

                    return globalMouseMove$.pipe(
                        map(moveEvent => this.getCanvasCoordinates(moveEvent)),
                        tap(({ x: cursorX, y: cursorY }) => {
                            if (this.selectedFigure) {
                                this.selectedFigure.rotation = this.selectedFigure.getAngleForRotation(cursorX, cursorY);
                                this.renderAllFigures();
                            }
                        }),
                        takeUntil(globalMouseUp$.pipe(tap(() => {
                            this.canvasMode = CanvasState.idle;
                        })))
                    );

                case CanvasState.idle:
                case CanvasState.drawing:
                    if (this.canvasMode === CanvasState.idle) {
                        this.canvasMode = CanvasState.drawing;
                        currentDrawing = [{ x: startPos.x, y: startPos.y }];
                    } else {
                        if (this.isCloseToStartVertex(currentDrawing, startPos.x, startPos.y)) {
                            if (currentDrawing.length > 2) {
                                const newFigure = new Figure([...currentDrawing], 0, this.activeColor);
                                this.figureCollection.push(newFigure);
                                this.selectedFigure = newFigure;
                            }
                            this.canvasMode = CanvasState.idle;
                            currentDrawing = [];
                            this.renderAllFigures();
                        } else {
                            currentDrawing.push({ x: startPos.x, y: startPos.y });

                            this.renderAllFigures();
                            const ctx = this.context();
                            ctx.lineWidth = 2;
                            ctx.strokeStyle = `rgba(${this.activeColor}, 1)`;
                            
                            ctx.beginPath();
                            currentDrawing.forEach((point, index) => {
                                index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y);
                            });
                            ctx.stroke();
                        }
                    }
                    return EMPTY;

                default:
                    return EMPTY;
            }
        })
    ).subscribe();

    globalMouseMove$.pipe(
        takeUntilDestroyed(this.destroyRef),
        filter(() => this.canvasMode === CanvasState.drawing && currentDrawing.length > 0),
        map(event => this.getCanvasCoordinates(event)),
        tap(({ x: currentX, y: currentY }) => {
            this.renderAllFigures();
            const ctx = this.context();
            ctx.lineWidth = 2;
            ctx.strokeStyle = `rgba(${this.activeColor}, 1)`;
            ctx.fillStyle = `rgba(${this.activeColor}, 0.5)`;

            ctx.beginPath();
            currentDrawing.forEach((point, index) => {
                index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y);
            });
            ctx.stroke();

            const lastPoint = currentDrawing.at(-1)!;
            ctx.beginPath();
            ctx.moveTo(lastPoint.x, lastPoint.y);
            ctx.lineTo(currentX, currentY);
            ctx.stroke();
        })
    ).subscribe();
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
        ? [ ...this.allCanvasData.slice(0, characterIndex), updatedCanvasData, ...this.allCanvasData.slice(characterIndex + 1) ]
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
}