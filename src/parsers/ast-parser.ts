import { Project, SourceFile } from 'ts-morph';

export interface ParsedFile {
  sourceFile: SourceFile;
  interfaces: Map<string, string>;
}

export function parseFile(filePath: string): ParsedFile {
  const project = new Project({
    useInMemoryFileSystem: false,
  });
  
  const sourceFile = project.addSourceFileAtPath(filePath);
  
  const interfaces = new Map<string, string>();
  
  sourceFile.getInterfaces().forEach(iface => {
    const props: string[] = [];
    iface.getProperties().forEach(prop => {
      const name = prop.getName();
      if (name) {
        const type = prop.getType();
        props.push(`${name}: ${type.getText()}`);
      }
    });
    interfaces.set(iface.getName() ?? '', props.join('; '));
  });
  
  return { sourceFile, interfaces };
}
