<?php

namespace Database\Seeders;

use App\Models\District;
use App\Models\Zone;
use Illuminate\Database\Seeder;

class DistrictTableSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $districts = "
Adrianópolis; Centro-Sul; 248,45; 10 459; 3 560,88; 3 224\n
Aleixo; Centro-Sul; 618,34; 24 417; 3 340,40; 6 101\n
Alvorada; Centro-Oeste; 553,18; 76 392; 11 681,73; 18 193\n
Armando Mendes; Leste; 307,65; 33 441; 9 194,86; 7 402\n
Betânia; Sul; 52,51; 12 940; 20 845,55; 3 119\n
Cachoeirinha; Sul; 197,71; 20 035; 8 572,15; 5 363\n
Centro; Sul; 426,94; 39 228; 7 772,29; 10 828\n
Chapada; Centro-Sul; 241,27; 13 219; 4 634,64; 4 324\n
Cidade de Deus; Norte; 676,76; 82 919; 10 364,38; 19 385\n
Cidade Nova; Norte; 1 419,38; 143 201; 8 534,36; 34 239\n
Colônia Antônio Aleixo; Leste; 923,82; 19 626; 1 797,10; 4 125\n
Colônia Oliveira Machado; Sul; 140,01; 10 055; 6 075,28; 2 140\n
Colônia Santo Antônio; Norte; 342,08; 20 851; 5 156,10; 5 112\n
Colônia Terra Nova; Norte; 943,98; 53 287; 4 775,10; 12 778\n
Compensa; Oeste; 508,27; 89 645; 14 919,63; 19 956\n
Coroado; Leste; 1 031,62; 60 709; 4 978,00; 14 571\n
Crespo; Sul; 110,11; 18 266; 14 032,33; 4 312\n
Da Paz; Centro-Oeste; 240,97; 17 961; 6 304,93; 4 452\n
Distrito Industrial I; Sul; 1 168,59; 3 201; 231,73; 812\n
Distrito Industrial II; Leste; 5 137,69; 4 609; 75,89; 1 263\n
Dom Pedro; Centro-Oeste; 275,78; 20 179; 6 189,72; 4 936\n
Educandos; Sul; 82,83; 18 745; 19 144,03; 4 266\n
Flores; Centro-Sul; 1 311,57; 56 859; 3 667,21; 15 639\n
Gilberto Mestrinho; Leste; 707,15; 65 429; 7 826,77; 15 188\n
Glória; Oeste; 49,47; 10 617; 18 154,44; 2 422\n
Japiim; Sul; 547,63; 63 092; 9 745,63; 16 322\n
Jorge Teixeira; Leste; 1 557,15; 133 441; 7 249,08; 30 331\n
Lago Azul; Norte; 2 961,87; 9 022; 257,68; 2 341\n
Lírio do Vale; Oeste; 214,01; 25 457; 10 062,15; 6 162\n
Mauazinho; Leste; 748,83; 27 852; 3 146,24; 6 066\n
Monte das Oliveiras; Norte; 401,92; 47 478; 9 992,54; 11 398\n
Morro da Liberdade; Sul; 71,37; 14 078; 16 686,28; 3 402\n
Nossa Senhora Aparecida; Sul; 66,85; 8 270; 10 465,22; 2 222\n
Nossa Senhora das Graças; Centro-Sul; 211,72; 17 869; 7 139,62; 5 069\n
Nova Cidade; Norte; 1 044,48; 70 428; 5 703,89; 18 005\n
Nova Esperança; Oeste; 147,78; 20 919; 11 974,56; 5 073\n
Novo Aleixo; Norte; 1 276,78; 114 209; 7 566,77; 26 457\n
Novo Israel; Norte; 140,14; 19 887; 12 004,42; 4 505\n
Parque 10 de Novembro; Centro-Sul; 821,12; 48 771; 5 024,36; 13 433\n
Petrópolis; Sul; 324,10; 48 717; 12 715,21; 11 561\n
Planalto; Centro-Oeste; 429,22; 19 249; 3 793,63; 4 818\n
Ponta Negra; Oeste; 2 413,04; 5 919; 207,50; 2 304\n
Praça 14 de Janeiro; Sul; 100,34; 12 117; 10 215,27; 3 004\n
Presidente Vargas; Sul; 56,70; 9 391; 14 010,58; 2 213\n
Puraquequara; Leste; 4 055,69; 6 923; 144,39; 1 758\n
Raiz; Sul; 85,92; 16 694; 16 436,22; 4 061\n
Redenção; Centro-Oeste; 300,16; 41 572; 11 715,75; 9 457\n
Santa Etelvina; Norte; 669,45; 31 043; 3 922,62; 7 166\n
Santa Luzia; Sul; 27,39; 7 688; 23 742,24; 1 897\n
Santo Agostinho; Oeste; 149,07; 19 616; 11 131,01; 4 663\n
Santo Antônio; Oeste; 113,15; 23 356; 17 460,89; 5 617\n
São Francisco; Sul; 162,28; 19 889; 10 367,27; 4 474\n
São Geraldo; Centro-Sul; 104,50; 8 983; 7 271,77; 2 497\n
São Jorge; Oeste; 320,95; 25 585; 6 743,42; 6 461\n
São José Operário; Leste; 543,10; 78 222; 12 183,58; 17 833\n
São Lázaro; Sul; 81,73; 14 108; 14 601,74; 3 502\n
São Raimundo; Oeste; 112,45; 18 199; 13 690,53; 4 356\n
Tancredo Neves; Leste; 304,64; 57 728; 16 029,74; 12 853\n
Tarumã; Oeste; 3 928,07; 33 168; 714,27; 8 912\n
Tarumã-Açu; Oeste; 4 807,05; 14 249; 250,74; 3 914\n
Vila Buriti; Sul; 1 004,96; 2 160; 181,80; 616\n
Vila da Prata; Oeste; 66,13; 13 052; 16 695,90; 2 933\n
Zumbi dos Palmares; Leste; 251,05; 41 563; 14 004,78; 8 853\n
        ";
        $districts = explode("\n", $districts);
        $districts = array_filter($districts);
        foreach ($districts as $district) {
            $data = explode(";", $district);
            if (sizeof($data) > 1)
                District::create([
                    'name' => $data[0],
                    'zone_id' => Zone::whereName(trim($data[1]))->first()->id,
                    'area' => (float)$data[2],
                    'population' => (int)$data[3],
                    'density' => (float)$data[4],
                    'households' => (int)$data[5],
                ]);
        }
    }
}
