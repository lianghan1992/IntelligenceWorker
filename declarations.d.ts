
declare module 'file-saver' {
    export function saveAs(data: Blob | string, filename?: string, options?: any): void;
}

declare module 'docx' {
    export class Document {
        constructor(options: any);
    }
    export class Packer {
        static toBlob(doc: Document): Promise<Blob>;
    }
    export class Paragraph {
        constructor(options: any);
    }
    export class TextRun {
        constructor(options: any);
    }
    export class ImageRun {
        constructor(options: any);
    }
    export enum HeadingLevel {
        HEADING_1 = "Heading1",
        HEADING_2 = "Heading2",
        HEADING_3 = "Heading3",
        TITLE = "Title"
    }
    export enum AlignmentType {
        START = "start",
        END = "end",
        CENTER = "center",
        BOTH = "both",
        JUSTIFIED = "justified",
        DISTRIBUTE = "distribute",
        LEFT = "left",
        RIGHT = "right"
    }
}
