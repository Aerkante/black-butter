<?php

namespace App\Http\Controllers;

use App\Models\District;
use App\Models\Report;
use App\Models\Zone;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller as BaseController;

class ChartController extends BaseController
{

    function index(Request $request)
    {
        $data = [
            'start_at' => $request->get('start_at', false),
            'end_at' => $request->get('end_at', false),
            'type' => $request->get('type', false),
            'filter_by' => $request->get('filter_by', false),
        ];

        $charts = [
            'Bar' => $this->callAction('getBarChart', [$data]),
            'Bubble' => null,
            'Doughnut' => null,
            'Line' => null,
            'Pie' => $this->callAction('getPieChart', [$data]),
            'PolarArea' => null,
            'Radar' => null,
            'Scatter' => null,
            'Bar with reactive data' => null,
            'Custom chart' => null,
            'Events' => null,
        ];

        if (!$data['type'])
            return response()->json(['message' => 'Type not found'], 404);

        if (!$data['filter_by'])
            return response()->json(['message' => 'Filter not found'], 404);

        return $charts[$data['type']];
    }

    function getPieChart($data): array
    {
        return match ($data['filter_by']) {
            'District' => $this->getDistrictPieChart($data),
            'Zone' => $this->getZonePieChart($data),
            default => $data,
        };
    }

    function getDistrictPieChart($data): array
    {
        $districtNames = District::pluck('name');

        if ($data['start_at'])
            $startAt = Carbon::parse($data["start_at"])->format('Y-m-d');
        else
            $startAt = Carbon::parse(Report::orderBy('created_at', 'asc')->value('created_at') ?? Carbon::now())->format('Y-m-d');

        if ($data['end_at'])
            $endAt = Carbon::parse($data["end_at"])->format('Y-m-d');
        else
            $endAt = Carbon::parse(Report::orderBy('created_at', 'desc')->value('created_at') ?? Carbon::now())->format('Y-m-d');

        $reportCounts = [];
        foreach ($districtNames as $key => $district) {
            $counts = Report::whereDistrict($district)
                ->whereDate('created_at', '>=', $startAt)
                ->whereDate('created_at', '<=', $endAt)
                ->count();
            if ($counts > 0)
                $reportCounts[] = $counts;
            else
                unset($districtNames[$key]);
        }

        $backgroundColors = array_map(fn() => $this->rand_color(), $districtNames->toArray());
        $backgroundColors = array_reverse($backgroundColors);
        $labels = array_reverse($districtNames->toArray());

        return [
            "districts" => $districtNames,
            "type" => 'Pie',
            "filter_by" => 'district',
            "metadata" => [
                "labels" => [...$labels],
                "datasets" => [[
                    "backgroundColor" => [...$backgroundColors],
                    "data" => $reportCounts,
                ]],
            ],
            "end_at" => $endAt,
            "reports" => [],
            "start_at" => $startAt,
            "zones" => []
        ];
    }

    function rand_color(): string
    {
        return '#' . str_pad(dechex(mt_rand(0, 0xFFFFFF)), 6, '0', STR_PAD_LEFT);
    }

    function getZonePieChart($data)
    {
        $zoneNames = Zone::pluck('name');

        if ($data['start_at'])
            $startAt = Carbon::parse($data["start_at"])->format('Y-m-d');
        else
            $startAt = Carbon::parse(Report::orderBy('created_at', 'asc')->value('created_at') ?? Carbon::now())->format('Y-m-d');

        if ($data['end_at'])
            $endAt = Carbon::parse($data["end_at"])->format('Y-m-d');
        else
            $endAt = Carbon::parse(Report::orderBy('created_at', 'desc')->value('created_at') ?? Carbon::now())->format('Y-m-d');

        $reportCounts = [];
        foreach ($zoneNames as $key => $zone) {
            $counts = Report::whereZone($zone)
                ->whereDate('created_at', '>=', $startAt)
                ->whereDate('created_at', '<=', $endAt)
                ->count();
            if ($counts > 0)
                $reportCounts[] = $counts;
            else
                unset($zoneNames[$key]);
        }

        $backgroundColors = array_map(fn() => $this->rand_color(), $zoneNames->toArray());
        $backgroundColors = array_reverse($backgroundColors);
        $labels = array_reverse($zoneNames->toArray());

        return [
            "zones" => $zoneNames,
            "type" => 'Pie',
            "filter_by" => 'district',
            "metadata" => [
                "labels" => [...$labels],
                "datasets" => [[
                    "backgroundColor" => [...$backgroundColors],
                    "data" => $reportCounts,
                ]],
            ],
            "end_at" => $endAt,
            "reports" => [],
            "start_at" => $startAt,
            "districts" => []
        ];
    }

    function getBarChart($data): array
    {
        return match ($data['filter_by']) {
            'Indicator' => $this->getIndicatorBarChart($data),
            default => $data,
        };
    }

    function getIndicatorBarChart($data): array
    {
        $indicatorNames = ['Qualidade do ar', 'Qualidade da água', 'Poluição Sonora'];

        if ($data['start_at'])
            $startAt = Carbon::parse($data["start_at"])->format('Y-m-d');
        else
            $startAt = Carbon::parse(Report::orderBy('created_at', 'asc')->value('created_at') ?? Carbon::now())->format('Y-m-d');

        if ($data['end_at'])
            $endAt = Carbon::parse($data["end_at"])->format('Y-m-d');
        else
            $endAt = Carbon::parse(Report::orderBy('created_at', 'desc')->value('created_at') ?? Carbon::now())->format('Y-m-d');

        $airIndex = 0;
        $airMax = 0;
        $waterIndex = 0;
        $waterMax = 0;
        $soundIndex = 0;
        $soundMax = 0;
        foreach ($indicatorNames as $key => $indicator) {
            switch ($key) {
                case 0:
                    $airIndex = array_sum(Report::whereDate('created_at', '>=', $startAt)
                        ->whereDate('created_at', '<=', $endAt)
                        ->pluck('air_pollution_index')->toArray());
                    $airMax = sizeof(Report::whereDate('created_at', '>=', $startAt)
                        ->whereDate('created_at', '<=', $endAt)
                        ->pluck('air_pollution_index')->toArray());
                    break;
                case 1:
                    $waterIndex = array_sum(Report::whereDate('created_at', '>=', $startAt)
                        ->whereDate('created_at', '<=', $endAt)
                        ->pluck('water_pollution_index')->toArray());
                    $waterMax = sizeof(Report::whereDate('created_at', '>=', $startAt)
                        ->whereDate('created_at', '<=', $endAt)
                        ->pluck('water_pollution_index')->toArray());
                    break;
                case 2:
                    $soundIndex = array_sum(Report::whereDate('created_at', '>=', $startAt)
                        ->whereDate('created_at', '<=', $endAt)
                        ->pluck('sound_pollution_index')->toArray());
                    $soundMax = sizeof(Report::whereDate('created_at', '>=', $startAt)
                        ->whereDate('created_at', '<=', $endAt)
                        ->pluck('sound_pollution_index')->toArray());

                    break;
                default:
                    break;
            }
        }

        $reportCounts = [$airIndex, $waterIndex, $soundIndex];
        $colors = [
            'good' => '#4caf50',
            'attention' => '#ffeb3b',
            'warning' => '#ff9800',
            'critic' => '#f44336',
        ];

        $backgroundColors = [];
        foreach ($reportCounts as $key => $reportCount) {
            switch ($key) {
                case 0:
                    if ($reportCount == 0 || $airMax == 0)
                        $reportCounts[$key] = 0;
                    else
                        $reportCounts[$key] = (float)number_format($reportCount / ($airMax * 100), 2,);
                    $backgroundColors[] = $this->defineMetricColor($reportCounts[$key], $colors);
                    break;
                case 1:
                    if ($reportCount == 0 || $waterMax == 0)
                        $reportCounts[$key] = 0;
                    else
                        $reportCounts[$key] = (float)number_format($reportCount / ($waterMax * 100), 2);
                    $backgroundColors[] = $this->defineMetricColor($reportCounts[$key], $colors);
                    break;

                case 2:
                    if ($reportCount == 0 || $soundMax == 0)
                        $reportCounts[$key] = 0;
                    else
                        $reportCounts[$key] = (float)number_format($reportCount / ($soundMax * 100), 2);
                    $backgroundColors[] = $this->defineMetricColor($reportCounts[$key], $colors);
                    break;

            }
        }

        $labels = $indicatorNames;
        $datasets = [];


        $datasets[] = [
            'data' => $reportCounts,
            'backgroundColor' => $backgroundColors,
        ];


        return [
            "zones" => [],
            "type" => 'Pie',
            "filter_by" => 'district',
            "metadata" => [
                "labels" => $labels,
                "datasets" => [...$datasets]
            ],
            "end_at" => $endAt,
            "reports" => [],
            "start_at" => $startAt,
            "districts" => []
        ];
    }

    function defineMetricColor(float $value, array $colors): mixed
    {
        if ($value < 0.3)
            return $colors['critic'];
        else if ($value >= 0.3 && $value <= 0.4)
            return $colors['attention'];
        else if ($value < 0.5)
            return $colors['warning'];
        return $colors['good'];
    }
}
