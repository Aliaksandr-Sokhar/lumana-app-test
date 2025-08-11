import {
  CANVAS_COLORS,
  RECTANGLE_COLOR,
} from "../consts/canvas.const";

export interface Vector {
  x: number;
  y: number;
}

export class Figure {
  public vertices: Vector[];
  public rotation: number;
  public fillColor: string;

  constructor(
    vertices: Vector[],
    rotation: number = 0,
    fillColor: string = RECTANGLE_COLOR.purple
  ) {
    this.vertices = vertices;
    this.rotation = rotation;
    this.fillColor = fillColor;
  }

  private getGeometricProperties() {
    const xCoords = this.vertices.map((v) => v.x);
    const yCoords = this.vertices.map((v) => v.y);

    const minX = Math.min(...xCoords);
    const maxX = Math.max(...xCoords);
    const minY = Math.min(...yCoords);
    const maxY = Math.max(...yCoords);

    return {
      minX,
      maxX,
      minY,
      maxY,
      centerX: minX + (maxX - minX) / 2,
      centerY: minY + (maxY - minY) / 2,
    };
  }

  private getRotatedPoints(points: Vector[]): Vector[] {
    const { centerX, centerY } = this.getGeometricProperties();
    const cosAngle = Math.cos(this.rotation);
    const sinAngle = Math.sin(this.rotation);

    return points.map((point) => {
      const translatedX = point.x - centerX;
      const translatedY = point.y - centerY;

      return {
        x: centerX + translatedX * cosAngle - translatedY * sinAngle,
        y: centerY + translatedX * sinAngle + translatedY * cosAngle,
      };
    });
  }

  private createPathFromPoints(points: Vector[]): Path2D {
    const path = new Path2D();
    if (points.length === 0) {
      return path;
    }
    path.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      path.lineTo(points[i].x, points[i].y);
    }
    path.closePath();
    return path;
  }

  public render(ctx: CanvasRenderingContext2D): void {
    const rotatedVertices = this.getRotatedPoints(this.vertices);
    const shapePath = this.createPathFromPoints(rotatedVertices);

    ctx.fillStyle = `rgba(${this.fillColor}, 0.5)`;
    ctx.lineWidth = 2;
    ctx.strokeStyle = `rgba(${this.fillColor})`;

    ctx.fill(shapePath);
    ctx.stroke(shapePath);
  }

  public translate(deltaX: number, deltaY: number): void {
    this.vertices = this.vertices.map(({ x, y }) => ({
      x: x + deltaX,
      y: y + deltaY,
    }));
  }

  public isPointerOver(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number
  ): boolean {
    const rotatedVertices = this.getRotatedPoints(this.vertices);
    const shapePath = this.createPathFromPoints(rotatedVertices);
    return ctx.isPointInPath(shapePath, x, y);
  }

  public drawSelectionFrame(ctx: CanvasRenderingContext2D): void {
    const { minX, maxX, minY, maxY } = this.getGeometricProperties();
    const boundingBoxCorners = [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY },
    ];

    const rotatedCorners = this.getRotatedPoints(boundingBoxCorners);
    const framePath = this.createPathFromPoints(rotatedCorners);

    ctx.lineWidth = 1;
    ctx.strokeStyle = "black";
    ctx.stroke(framePath);

    const rotationHandlePath = new Path2D();
    const rotationHandleCorner = rotatedCorners[0];
    rotationHandlePath.arc(
      rotationHandleCorner.x,
      rotationHandleCorner.y,
      6,
      0,
      Math.PI * 2
    );

    ctx.fillStyle = CANVAS_COLORS.green;
    ctx.fill(rotationHandlePath);
  }

  public isPointerNearRotationHandle(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number
  ): boolean {
    const { minX, minY } = this.getGeometricProperties();
    const corner = { x: minX, y: minY };
    const [rotatedCorner] = this.getRotatedPoints([corner]);

    const handlePath = new Path2D();
    handlePath.arc(rotatedCorner.x, rotatedCorner.y, 8, 0, Math.PI * 2);
    return ctx.isPointInPath(handlePath, x, y);
  }

  public getAngleForRotation(
    pointerX: number,
    pointerY: number
  ): number {
    const { minX, minY, centerX, centerY } = this.getGeometricProperties();

    const anchorVector = { x: minX - centerX, y: minY - centerY };
    const pointerVector = { x: pointerX - centerX, y: pointerY - centerY };

    const anchorAngle = Math.atan2(anchorVector.y, anchorVector.x);
    const pointerAngle = Math.atan2(pointerVector.y, pointerVector.x);

    return pointerAngle - anchorAngle;
  }
}