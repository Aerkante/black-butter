<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class District extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'zone_id',
        'area',
        'population',
        'density',
        'households',
    ];

    function zone()
    {
        return $this->belongsTo(Zone::class);
    }
}
