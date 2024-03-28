<?php

namespace Database\Seeders;

use App\Models\Zone;
use Illuminate\Database\Seeder;

class ZoneTableSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $zones = [
            "Centro-Sul",
            "Centro-Oeste",
            "Leste",
            "Sul",
            "Norte",
            "Oeste",
        ];


        foreach ($zones as $zone) {
            Zone::create(['name' => $zone]);
        }

    }
}
