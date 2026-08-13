<?php
/**
 * Author: night
 * Date: 2015/4/8
 * Time: 15:13
 */

if (!isset($_GET['auth']) || $_GET['auth'] != "88224466") {
    die();
}
$filePath = "../runtime/logs/";
$level = isset($_GET['level']) ? $_GET['level'] : "error";
switch ($level) {
    case "error":
        $filePath .= "error.log";
        break;
    case "info":
        $filePath .= "info.log";
        break;
    case "trace":
        $filePath .= "trace.log";
        break;
    case "warning":
        $filePath .= "warning.log";
        break;
    case "app":
        $filePath .= "app.log";
        break;
    default:
        $filePath .= "error.log";
        break;
}
$num = isset($_GET['num']) && is_numeric($_GET['num']) && $_GET['num'] > 0 ? $_GET['num'] : 100;
echo "<pre>";
echo FileLastLines($filePath, $num);
die();

function FileLastLines($filename, $n)
{
    if (!$fp = fopen($filename, 'r')) {
        echo "打开文件失败，请检查文件路径是否正确";
        return false;
    }
    $pos = -2;
    $eof = "";
    $str = "";
    while ($n > 0) {
        while ($eof != "\n") {
            if (!fseek($fp, $pos, SEEK_END)) {
                $eof = fgetc($fp);
                $pos--;
            } else {
                break;
            }
        }
        $str .= fgets($fp);
        $eof = "";
        $n--;
    }
    return $str;
}
