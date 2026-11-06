import { parseColunas, parseLinhas, casarLinha, type Candidato } from '../lib/statsImagem';
const assert = (c: boolean, m: string) => { if (!c) { console.error('FALHOU:', m); process.exit(1); } console.log('ok  -', m); };

const { colunas, invalidas } = parseColunas('Crn S SoT _ P Sav xx');
assert(colunas.length === 6 && colunas[3] === null && invalidas[0] === 'xx', 'parseColunas');

const txt = `Jogador Crn S SoT
123456 Vitor Roque 3 1 0 45 2
Gabigol 0 l O 38 -
Cássio  | 2 0 1
Linha sem numeros`;
const l = parseLinhas(txt);
assert(l.length === 3, 'ignora cabeçalho e linha sem números');
assert(l[0].prefixos[0] === 123456 && l[0].nome === 'Vitor Roque' && l[0].valores.join() === '3,1,0,45,2', 'linha com registro');
assert(l[1].valores.join() === '0,1,0,38,0', 'correções O→0, l→1, - → 0');

const mk = (id: string, nome: string, registro: number, alias?: string): Candidato => ({
  jogador: { id, nome, registro, alias_opta: alias } as any, esc: { jogador_id: id, numero: 1 } as any, lado: 'casa',
});
const cands = [mk('a', 'Vitor Roque', 123456), mk('b', 'Gabriel Barbosa', 2, 'Gabigol'), mk('c', 'Everson', 3), mk('d', 'Everson Silva', 4), mk('e', 'Cássio Ramos', 5)];
assert(casarLinha(l[0], cands).metodo === 'registro', 'casa por registro');
assert(casarLinha(l[1], cands).jogador_id === 'b' && casarLinha(l[1], cands).metodo === 'alias', 'casa por alias');
assert(casarLinha({ nome: 'Everson', prefixos: [] }, cands).jogador_id === 'c', 'nome exato prevalece sobre parcial');
const ap = casarLinha({ nome: 'Cassio', prefixos: [] }, cands);
assert(ap.jogador_id === 'e' && ap.metodo === 'aproximado', 'aproximado (substring)');
assert(casarLinha({ nome: 'Fulano Inexistente', prefixos: [] }, cands).jogador_id === null, 'sem casamento');
