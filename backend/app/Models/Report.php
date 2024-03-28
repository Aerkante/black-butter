<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Report extends Model
{
    use HasFactory;

    protected $fillable = [
        'register',
        'district',
        'zone',
        'water_pollution_index',
        'sound_pollution_index',
        'air_pollution_index',
    ];
}
